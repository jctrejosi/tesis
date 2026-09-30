#!/usr/bin/env node
'use strict';

/* =====================================================================
 * excite.js — Política de excitación suave (Fase 1).
 *
 * Conmuta los canales del relé con baja probabilidad y respetando las
 * `constraints` del registro de actuadores, para que la serie `u_t` tenga
 * variación suficiente y la **matriz de efecto `E[canal][variable]`** sea
 * aprendible (docs/especificacion.md §4.4). Es "suave": respeta intervalos
 * mínimos, duración máxima, cooldown y máximo de conmutaciones por hora.
 *
 *   ESP  <- growbox/relay/set   {channel, state}
 *
 * Uso:
 *   node scripts/excite.js [opciones]
 *
 * Opciones:
 *   --period <s>        Cadencia de decisión (def: 20)
 *   --p <0..1>          Prob. de conmutar un canal elegible por tick (def: 0.08)
 *   --device-id <n>     Dispositivo (def: 1)
 *   --duration <s>      Termina tras N segundos (def: 0 = indefinido)
 *   --help
 * ===================================================================== */

const path = require('path');

function loadMod(name) {
  try {
    return require(name);
  } catch {
    return require(path.join(__dirname, '..', 'backend', 'node_modules', name));
  }
}

const mqtt = loadMod('mqtt');
const { Client: PgClient } = loadMod('pg');

const BROKER = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://cea_user:cea_password@localhost:5438/cea_db';

// Límites por defecto si el registro no los define (conservadores).
const DEFAULT_CONSTRAINTS = {
  min_interval_s: 600,
  max_duration_s: 180,
  max_switches_per_hour: 6,
  cooldown_s: 60,
};

function parseArgs(argv) {
  const opts = { period: 20, p: 0.08, deviceId: 1, duration: 0 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--help':
      case '-h':
        console.log(
          fs_readHelp(),
        );
        process.exit(0);
        break;
      case '--period': opts.period = Number(next()) || opts.period; break;
      case '--p': opts.p = Math.min(1, Math.max(0, Number(next()) || opts.p)); break;
      case '--device-id': opts.deviceId = Number(next()) || opts.deviceId; break;
      case '--duration': opts.duration = Number(next()) || 0; break;
      default:
        console.error(`[excite] opción desconocida: ${a}`);
    }
  }
  return opts;
}

function fs_readHelp() {
  return require('fs')
    .readFileSync(__filename, 'utf8')
    .split('* =====')[0]
    .replace(/^\/\*+/, '');
}

async function loadRegistry(deviceId) {
  const client = new PgClient({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query(
      `SELECT r.channel, r.function, r.constraints, r.enabled, a.state
         FROM plant_service.actuator_registry r
         LEFT JOIN actuators a
           ON a.device_id = r.device_id AND a.name = 'canal_' || r.channel
        WHERE r.device_id = $1
        ORDER BY r.channel`,
      [deviceId],
    );
    return res.rows.map((r) => ({
      channel: Number(r.channel),
      function: r.function,
      enabled: r.enabled !== false,
      constraints: { ...DEFAULT_CONSTRAINTS, ...(r.constraints || {}) },
      initial: r.state && r.state.state === 'ON' ? 'ON' : 'OFF',
    }));
  } catch (err) {
    console.error('[excite] no se pudo leer el registro:', err.message);
    return [];
  } finally {
    await client.end();
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const channels = await loadRegistry(opts.deviceId);
  if (!channels.length) {
    console.error('[excite] registro vacío: nada que excitar (¿está levantado plant-service?).');
    process.exit(1);
  }

  const state = {}; // channel -> { on, lastChange, onSince, switches: [] }
  for (const c of channels) {
    state[c.channel] = { on: c.initial === 'ON', lastChange: 0, onSince: 0, switches: [] };
  }

  const client = mqtt.connect(BROKER, { clientId: `excite-${Date.now()}` });
  client.on('connect', () => console.log(`[excite] conectado a ${BROKER} (device ${opts.deviceId})`));
  client.on('error', (err) => console.error('[excite] error MQTT:', err.message));

  function setChannel(channel, nextState) {
    client.publish('growbox/relay/set', JSON.stringify({ channel: Number(channel), state: nextState }));
  }

  function tick() {
    const now = Date.now();
    for (const c of channels) {
      if (!c.enabled) continue;
      const st = state[c.channel];
      const k = c.constraints;

      // Corte por duración máxima.
      if (st.on && st.onSince && (now - st.onSince) / 1000 >= k.max_duration_s) {
        st.on = false;
        st.lastChange = now;
        st.onSince = 0;
        st.switches.push(now);
        setChannel(c.channel, 'OFF');
        console.log(`[excite] canal_${c.channel} → OFF (duración máx.)`);
        continue;
      }

      // Respeta intervalo mínimo / cooldown.
      const wait = Math.max(k.min_interval_s, k.cooldown_s) * 1000;
      if (st.lastChange && now - st.lastChange < wait) continue;

      // Rate limit por hora.
      st.switches = st.switches.filter((t) => now - t < 3600e3);
      if (st.switches.length >= k.max_switches_per_hour) continue;

      // Conmutación aleatoria suave.
      if (Math.random() < opts.p) {
        const next = st.on ? 'OFF' : 'ON';
        st.on = next === 'ON';
        st.lastChange = now;
        st.onSince = st.on ? now : 0;
        st.switches.push(now);
        setChannel(c.channel, next);
        console.log(`[excite] canal_${c.channel} → ${next} (${c.function})`);
      }
    }
  }

  tick();
  const timer = setInterval(tick, opts.period * 1000);
  console.log(`[excite] activo: periodo ${opts.period}s, p=${opts.p}, ${channels.length} canales`);

  const stop = () => {
    clearInterval(timer);
    console.log('[excite] deteniendo');
    client.end(false, {}, () => process.exit(0));
    setTimeout(() => process.exit(0), 1000).unref();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  if (opts.duration > 0) setTimeout(stop, opts.duration * 1000);
}

main().catch((err) => {
  console.error('[excite] error:', err.message);
  process.exit(1);
});
