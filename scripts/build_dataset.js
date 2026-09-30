#!/usr/bin/env node
'use strict';

/* =====================================================================
 * build_dataset.js — Dataset para el world model / MPC (Fase 0).
 *
 * Construye muestras de ventana a partir de TimescaleDB:
 *
 *   x_hist   [k, dim_x]   estado (métricas crudas + derivadas) en los k pasos previos
 *   u_hist   [k, 4]       acciones del relé (1 = ON, 0 = OFF)
 *   d_hist   [k, dim_d]   contexto temporal: hora sin/cos + día de la semana sin/cos
 *   y_future [h, dim_x]   estados futuros a predecir
 *
 * Además, por muestra (metadatos, no tensores):
 *   phase     nombre de la fase activa en `t` (fase -> `static_features`)
 *   x_target  setpoints vigentes en `t` (referencia x* del coste del MPC)
 *   simulated origen del dato (simulado/real)
 *
 * Contrato de `d_t`: ver docs/datos.md §1.3.
 *
 * Re-muestrea a una cadencia común, rellena hacia delante y emite NDJSON:
 *   {"type":"meta", ...}            (primera línea)
 *   {"type":"sample","t":..., ...}  (una por ventana)
 *
 * Uso:
 *   node scripts/build_dataset.js [opciones]
 *
 * Opciones:
 *   --from <iso|now-30m>   Inicio del rango   (def: últimos 30 min)
 *   --to <iso>             Fin del rango      (def: ahora)
 *   --freq <segundos>      Cadencia de bucket (def: 60)
 *   --k <n>                Pasos de historia   (def: 12)
 *   --h <n>                Pasos a predecir   (def: 3)
 *   --metrics <csv>        Métricas del estado (def: conjunto núcleo)
 *   --out <ruta>           Salida NDJSON       (def: files/dataset.ndjson)
 *   --help
 *
 * Requiere el paquete `pg` (se resuelve desde backend/node_modules) y que la
 * base tenga datos. Nota: hoy no se distingue si un dato es simulado o real.
 * ===================================================================== */

const fs = require('fs');
const path = require('path');

let pg;
try {
  pg = require('pg');
} catch {
  try {
    pg = require(path.join(__dirname, '..', 'backend', 'node_modules', 'pg'));
  } catch {
    console.error('[dataset] No se encontró el paquete "pg" (revisa backend/node_modules).');
    process.exit(1);
  }
}

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://cea_user:cea_password@localhost:5438/cea_db';

// Conjunto núcleo del vector de estado x_t (ver docs/datos.md §1.2).
const DEFAULT_METRICS = [
  'temperature', 'humidity', 'pressure', 'co2', 'ec',
  'vpd', 'dew_point', 'ndvi', 'par', 'ec_compensated',
];
const CHANNELS = [1, 2, 3, 4];

function parseArgs(argv) {
  const opts = { freq: 60, k: 12, h: 3, metrics: DEFAULT_METRICS, out: 'files/dataset.ndjson' };
  const now = new Date();
  opts.to = now;
  opts.from = new Date(now.getTime() - 30 * 60 * 1000);
  let i = 0;
  const next = () => argv[++i];
  for (i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--help':
      case '-h':
        console.log(fs.readFileSync(__filename, 'utf8').split('* =====')[0].replace(/^\/\*+/, ''));
        process.exit(0);
        break;
      case '--from': opts.from = parseTime(next()); break;
      case '--to': opts.to = parseTime(next()); break;
      case '--freq': opts.freq = parseInt(next(), 10) || 60; break;
      case '--k': opts.k = parseInt(next(), 10) || 12; break;
      case '--h': opts.h = parseInt(next(), 10) || 3; break;
      case '--metrics': opts.metrics = (next() || '').split(',').map((s) => s.trim()).filter(Boolean); break;
      case '--out': opts.out = next() || opts.out; break;
      default:
        console.error(`[dataset] opción desconocida: ${argv[i]}`);
    }
  }
  return opts;
}

function parseTime(value) {
  if (!value) return new Date();
  const m = /^now-(\d+)([smhd])$/.exec(value);
  if (m) {
    const mult = { s: 1e3, m: 60e3, h: 3600e3, d: 86400e3 }[m[2]];
    return new Date(Date.now() - Number(m[1]) * mult);
  }
  return new Date(value);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const freqMs = opts.freq * 1000;
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  // 1. Telemetría: una media por métrica y bucket.
  const telem = await client.query(
    `SELECT time_bucket($1::interval, time) AS bucket, metric_name, avg(value) AS value,
            bool_or(simulated) AS simulated
       FROM telemetry
      WHERE time >= $2::timestamptz AND time <= $3::timestamptz
      GROUP BY 1, 2
      ORDER BY 1`,
    [`${opts.freq} seconds`, opts.from.toISOString(), opts.to.toISOString()],
  );

  // 2. Acciones: último estado por canal y bucket.
  const actions = await client.query(
    `SELECT time_bucket($1::interval, time) AS bucket, channel, last(state, time) AS state
       FROM control_actions
      WHERE time >= $2::timestamptz AND time <= $3::timestamptz
      GROUP BY 1, 2
      ORDER BY 1`,
    [`${opts.freq} seconds`, opts.from.toISOString(), opts.to.toISOString()],
  );

  // 2b. Setpoints históricos (referencia x* y fase activa por instante).
  //     Opcional: si la tabla no existe o está vacía, se emite null.
  let snapshots = [];
  try {
    const snaps = await client.query(
      `SELECT valid_from, phase_name, targets
         FROM plant_service.setpoint_snapshots
        ORDER BY valid_from`,
    );
    snapshots = snaps.rows.map((r) => ({
      t: new Date(r.valid_from).getTime(),
      phase: r.phase_name,
      targets: r.targets,
    }));
  } catch {
    console.warn('[dataset] sin setpoint_snapshots: x_target/phase quedarán en null');
  }

  await client.end();

  // 3. Línea temporal común.
  const startTs = Math.ceil(opts.from.getTime() / freqMs) * freqMs;
  const endTs = Math.floor(opts.to.getTime() / freqMs) * freqMs;
  const timeline = [];
  for (let t = startTs; t <= endTs; t += freqMs) timeline.push(t);
  const index = new Map(timeline.map((t, idx) => [t, idx]));

  // 4. Series alineadas (forward-fill).
  const xSeries = {};
  for (const metric of opts.metrics) xSeries[metric] = new Array(timeline.length).fill(null);
  const bucketSim = new Map();
  for (const row of telem.rows) {
    const ts = new Date(row.bucket).getTime();
    const idx = index.get(ts);
    if (idx !== undefined && xSeries[row.metric_name]) xSeries[row.metric_name][idx] = Number(row.value);
    if (!bucketSim.has(ts)) bucketSim.set(ts, row.simulated === null ? null : Boolean(row.simulated));
  }
  for (const metric of opts.metrics) forwardFill(xSeries[metric]);

  const uSeries = {};
  for (const ch of CHANNELS) uSeries[ch] = new Array(timeline.length).fill(0);
  for (const row of actions.rows) {
    const idx = index.get(new Date(row.bucket).getTime());
    if (idx !== undefined && uSeries[row.channel]) uSeries[row.channel][idx] = row.state === 'ON' ? 1 : 0;
  }
  for (const ch of CHANNELS) forwardFill(uSeries[ch], 0);

  const dimX = opts.metrics.length;
  const dimU = CHANNELS.length;
  const dimD = 4; // hora sin/cos + día de la semana sin/cos
  const n = timeline.length;

  // 5. Ventanas.
  const samples = [];
  for (let i = opts.k - 1; i + opts.h <= n - 1; i++) {
    const idxs = [];
    for (let j = i - opts.k + 1; j <= i; j++) idxs.push(j);
    const xHist = idxs.map((j) => opts.metrics.map((m) => xSeries[m][j]));
    const uHist = idxs.map((j) => CHANNELS.map((ch) => uSeries[ch][j]));
    const dHist = idxs.map((j) => ctx(timeline[j]));
    const yFuture = [];
    for (let j = i + 1; j <= i + opts.h; j++) yFuture.push(opts.metrics.map((m) => xSeries[m][j]));
    const snap = snapshotAt(snapshots, timeline[i]);
    samples.push({ t: new Date(timeline[i]).toISOString(), simulated: bucketSim.has(timeline[i]) ? bucketSim.get(timeline[i]) : null, x_hist: xHist, u_hist: uHist, d_hist: dHist, y_future: yFuture, phase: snap ? snap.phase : null, x_target: snap ? snap.targets : null });
  }

  // 6. Salida.
  const outPath = path.isAbsolute(opts.out) ? opts.out : path.join(__dirname, '..', opts.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const distinct = new Set(
    samples.map((s) => (s.simulated == null ? 'unknown' : s.simulated ? 'simulated' : 'real')),
  );
  const dataSource = distinct.size === 0 ? 'unknown' : distinct.size === 1 ? [...distinct][0] : 'mixed';
  const meta = {
    type: 'meta',
    metrics: opts.metrics, channels: CHANNELS,
    dim_x: dimX, dim_u: dimU, dim_d: dimD,
    static_features: ['phase'], // se emite por muestra en `phase` (string)
    k: opts.k, h: opts.h, freq_seconds: opts.freq,
    from: opts.from.toISOString(), to: opts.to.toISOString(),
    buckets: n, samples: samples.length,
    data_source: dataSource, // simulated | real | mixed | unknown
    generated_at: new Date().toISOString(),
  };
  const stream = fs.createWriteStream(outPath);
  stream.write(JSON.stringify(meta) + '\n');
  for (const s of samples) stream.write(JSON.stringify({ type: 'sample', ...s }) + '\n');
  await new Promise((res) => stream.end(res));

  console.log(`[dataset] ${samples.length} ventanas → ${path.relative(path.join(__dirname, '..'), outPath)}`);
  console.log(`[dataset] dim_x=${dimX} dim_u=${dimU} dim_d=${dimD}  k=${opts.k} h=${opts.h}  buckets=${n}`);
  console.log(`[dataset] rango: ${meta.from} → ${meta.to}`);
  if (samples.length === 0) {
    console.log('[dataset] sin ventanas: amplía el rango o reduce --k/--h (¿hay datos en ese intervalo?).');
  }
}

function ctx(ts) {
  const d = new Date(ts);
  const hourFrac = (d.getUTCHours() + d.getUTCMinutes() / 60) / 24;
  const dowFrac = d.getUTCDay() / 7;
  const ah = hourFrac * 2 * Math.PI;
  const ad = dowFrac * 2 * Math.PI;
  return [
    Number(Math.sin(ah).toFixed(6)),
    Number(Math.cos(ah).toFixed(6)),
    Number(Math.sin(ad).toFixed(6)),
    Number(Math.cos(ad).toFixed(6)),
  ];
}

// Setpoint vigente en `t` (última instantánea con valid_from <= t).
function snapshotAt(snapshots, ts) {
  let found = null;
  for (const s of snapshots) {
    if (s.t <= ts) found = s;
    else break;
  }
  return found;
}

function forwardFill(arr, initial = null) {
  let last = arr.find((v) => v !== null && v !== undefined);
  if (last === undefined) last = initial;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === null || arr[i] === undefined) arr[i] = last;
    else last = arr[i];
  }
}

main().catch((err) => {
  console.error('[dataset] error:', err.message);
  process.exit(1);
});
