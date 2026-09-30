#!/usr/bin/env node
'use strict';

/* =====================================================================
 * esp-sim.js — Dispositivo ESP32 simulado (sin hardware).
 *
 * Emula el firmware real a nivel MQTT: publica telemetría periódica de los
 * 4 sensores y responde a los comandos (lectura, configuración y relé), con
 * la misma forma de payload que el firmware (ver esp32/src/**):
 *
 *   ESP  -> growbox/<alias>/data        {device_id, timestamp, metrics}
 *   ESP  -> growbox/relay/<n>/state     {channel, state}
 *   ESP  -> growbox/status              boot | online | offline (LWT)
 *   ESP  <- growbox/<alias>/read        forzar lectura
 *   ESP  <- growbox/<alias>/config      aplicar/confirmar configuración
 *   ESP  <- growbox/relay/set           {channel, state}
 *
 * Se usa cuando no hay placa conectada:
 *   node dev.js --esp-simulation
 *
 * Variables de entorno (todas opcionales):
 *   MQTT_BROKER_URL, MQTT_CLIENT_ID, DEVICE_ID, SIM_VERSION,
 *   SIM_INTERVAL_BME680_MS, SIM_INTERVAL_AS7341_MS, SIM_INTERVAL_MHZ19B_MS,
 *   SIM_INTERVAL_SOIL_EC_MS, SIM_INTERVAL_RELAY_MS,
 *   SIM_PHYSICS (0 desactiva la física), SIM_FN_1..SIM_FN_4 (función de cada canal)
 * ===================================================================== */

const path = require('path');

// El paquete `mqtt` vive en backend/node_modules; se resuelve desde ahí para
// no añadir dependencias nuevas en la raíz del proyecto.
let mqtt;
try {
  mqtt = require('mqtt');
} catch {
  try {
    mqtt = require(path.join(__dirname, '..', 'backend', 'node_modules', 'mqtt'));
  } catch {
    console.error('[ESP-SIM] No se encontró el paquete "mqtt" (revisa backend/node_modules).');
    process.exit(1);
  }
}

const BROKER = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const CLIENT_ID = process.env.MQTT_CLIENT_ID || 'ESP32GrowBox';
const DEVICE_ID = Number(process.env.DEVICE_ID) || 1;
const VERSION = process.env.SIM_VERSION || 'sim-1.0.0';

// Mirrors process for micros since start, igual que `millis()*1000` del firmware.
const now = () => Number(process.hrtime.bigint() / 1000n);
const log = (...args) => console.log('[ESP-SIM]', ...args);
const drift = (base, amp) => Number((base + (Math.random() * 2 - 1) * amp).toFixed(3));

// Intervalos por defecto (los del firmware son 15–25 s; aquí algo más rápidos
// para que el entorno muestre actividad). Configurables por entorno.
const intervals = {
  bme680: Number(process.env.SIM_INTERVAL_BME680_MS) || 5000,
  as7341: Number(process.env.SIM_INTERVAL_AS7341_MS) || 5000,
  mhz19b: Number(process.env.SIM_INTERVAL_MHZ19B_MS) || 10000,
  soil_ec: Number(process.env.SIM_INTERVAL_SOIL_EC_MS) || 10000,
};
const RELAY_INTERVAL_MS = Number(process.env.SIM_INTERVAL_RELAY_MS) || 60000;

const relay = { 1: 'OFF', 2: 'OFF', 3: 'OFF', 4: 'OFF' };

/* ---------------------------------------------------------------------
 * Física del indoor (Fase 1).
 *
 * El estado del ambiente EVOLUCIONA y los relés lo modifican: cada canal
 * tiene una `function` y cada función empuja unas variables hacia un nuevo
 * equilibrio. Así `u_t` influye en `x_{t+1}` y el world model tiene
 * dinámica que aprender (antes los sensores eran ruido independiente).
 *
 * `SIM_PHYSICS=0` recupera el comportamiento anterior (ruido sin acoplo).
 * ------------------------------------------------------------------- */
const PHYSICS = process.env.SIM_PHYSICS !== '0';

// Función asignada a cada canal (configurable). El efecto real lo descubre
// el modelo (matriz E); aquí es solo el generador de datos.
const CHANNEL_FUNCTIONS = {
  1: process.env.SIM_FN_1 || 'ventilation',
  2: process.env.SIM_FN_2 || 'light',
  3: process.env.SIM_FN_3 || 'irrigation',
  4: process.env.SIM_FN_4 || 'extraction',
};

// Estado "verdadero" del ambiente (lo que los sensores miden con ruido).
const env = { temperature: 24, humidity: 60, co2: 850, ec: 1.5, light: 0.05 };
const EXT = { temperature: 18, humidity: 55, co2: 420 };

// Efecto de cada función: desplazamiento del equilibrio y acoplo al exterior
// (`exchange`: 0 = sellado, 1 = totalmente ventilado hacia EXT).
const FUNCTIONS = {
  ventilation:    { exchange: 0.6 },
  extraction:     { exchange: 0.45, humidity: -8 },
  humidification: { humidity: +28 },
  irrigation:     { humidity: +14, ec: -0.6, temperature: -0.4 },
  light:          { temperature: +3, light: +0.9 },
  heating:        { temperature: +8 },
  co2_injection:  { co2: +600 },
  other:          {},
};

// Constante de tiempo (s) de relajación por variable + cota física.
const TAU = { temperature: 90, humidity: 70, co2: 120, ec: 200, light: 15 };
const CLAMP = {
  temperature: [10, 45], humidity: [20, 100], co2: [300, 3000], ec: [0, 5], light: [0, 1],
};

function equilibrium() {
  const eq = { temperature: 24, humidity: 60, co2: 900, ec: 1.5, light: 0.05 };
  let exchange = 0;
  for (const [ch, state] of Object.entries(relay)) {
    if (state !== 'ON') continue;
    const fn = FUNCTIONS[CHANNEL_FUNCTIONS[ch]] || {};
    for (const [k, v] of Object.entries(fn)) {
      if (k === 'exchange') exchange += v;
      else eq[k] += v;
    }
  }
  exchange = Math.min(exchange, 0.95);
  for (const k of ['temperature', 'humidity', 'co2']) {
    eq[k] = eq[k] * (1 - exchange) + EXT[k] * exchange; // acoplo al exterior
  }
  return eq;
}

let lastStep = now();
function stepEnvironment() {
  const t = now();
  const dt = Math.min((t - lastStep) / 1e6, 5); // segundos, acotado
  lastStep = t;
  if (!PHYSICS) return; // sin física: el ambiente queda constante + ruido
  const eq = equilibrium();
  for (const k of Object.keys(env)) {
    const alpha = 1 - Math.exp(-dt / TAU[k]);
    const [lo, hi] = CLAMP[k];
    env[k] = Math.min(hi, Math.max(lo, env[k] + alpha * (eq[k] - env[k])));
  }
}

// Métricas con los mismos nombres que publica el firmware (formulas de
// backend/src/derivates/formulas/*.ts dependen de ellas).
const generators = {
  bme680: () => ({
    temperature: drift(env.temperature, 0.15),
    humidity: drift(env.humidity, 0.4),
    pressure: drift(1013, 0.6),
    // el gas del BME680 baja cuando sube el CO2 (proxy de calidad de aire)
    gas_resistance: Math.max(50, Math.round(drift(400 - (env.co2 - 850) * 0.05, 15))),
  }),
  as7341: () => {
    const base = 300 + env.light * 4000;
    const ch = (scale, amp) => Math.round(Math.max(0, drift(base * scale, amp)));
    return {
      f1_415nm: ch(0.19, 40),
      f2_445nm: ch(0.21, 40),
      f3_480nm: ch(0.23, 40),
      f4_515nm: ch(0.30, 50),
      f5_555nm: ch(0.10, 30),
      f6_590nm: ch(0.18, 40),
      f7_630nm: ch(0.13, 30),
      f8_680nm: ch(0.25, 40),
      clear: ch(1.0, 120),
      // NIR sube con la luz; se usa para NDVI
      nir: Math.round(Math.max(0, drift(base * (0.22 + env.light * 0.25), 60))),
    };
  },
  mhz19b: () => ({ co2: Math.round(drift(env.co2, 8)) }),
  soil_ec: () => ({ ec: drift(env.ec, 0.03), temperature: drift(env.temperature - 2, 0.2) }),
};

const client = mqtt.connect(BROKER, {
  clientId: CLIENT_ID,
  clean: true,
  keepalive: 30,
  reconnectPeriod: 5000,
  will: { topic: 'growbox/status', payload: 'offline', qos: 0, retain: true },
});

// Evita bucles: recuerda las confirmaciones de config que publicamos para no
// reaccionar a nuestro propio eco (estamos suscritos a growbox/+/config).
const recentEcho = new Map();

function publish(topic, payload) {
  client.publish(topic, payload);
  log(`${topic} -> ${payload}`);
}

function publishTelemetry(alias) {
  const payload = JSON.stringify({
    device_id: DEVICE_ID,
    simulated: true, // origen simulado (sin hardware)
    timestamp: now(),
    metrics: generators[alias](),
  });
  client.publish(`growbox/${alias}/data`, payload);
  log(`growbox/${alias}/data -> ${payload}`);
}

function publishRelayState(channel) {
  publish(
    `growbox/relay/${channel}/state`,
    JSON.stringify({ channel: Number(channel), state: relay[channel], simulated: true }),
  );
}

function publishRelayAll() {
  for (const ch of [1, 2, 3, 4]) publishRelayState(ch);
}

function echoConfig(topic, payload) {
  recentEcho.set(topic, payload);
  setTimeout(() => recentEcho.delete(topic), 3000);
  publish(topic, payload);
}

client.on('connect', () => {
  log(`conectado a ${BROKER} como ${CLIENT_ID} (device ${DEVICE_ID})`);

  publish(
    'growbox/status',
    JSON.stringify({ device_id: DEVICE_ID, simulated: true, status: 'boot', boot_time: now(), version: VERSION }),
  );
  publish('growbox/status', 'online');

  const topics = [
    'growbox/+/read',
    'growbox/+/read_config',
    'growbox/+/config',
    'growbox/relay/set',
    'growbox/relay/read',
    'growbox/relay/read_config',
  ];
  client.subscribe(topics, (err) =>
    err ? log('error al suscribirse:', err.message) : log(`suscrito a ${topics.join(', ')}`),
  );

  publishRelayAll();
  for (const alias of Object.keys(generators)) publishTelemetry(alias);
});

client.on('message', (topic, buf) => {
  const msg = buf.toString();
  const [, alias, command] = topic.split('/');

  // Relé
  if (topic === 'growbox/relay/set') {
    try {
      const { channel, state } = JSON.parse(msg);
      if (relay[channel] === undefined || !['ON', 'OFF'].includes(state)) {
        log('relay/set ignorado (canal/estado inválido)');
        return;
      }
      relay[channel] = state;
      publishRelayState(channel);
    } catch {
      log('relay/set JSON inválido');
    }
    return;
  }
  if (topic === 'growbox/relay/read' || topic === 'growbox/relay/read_config') {
    publishRelayAll();
    return;
  }

  if (!alias || !command) return;

  if (command === 'read' && generators[alias]) {
    publishTelemetry(alias);
    return;
  }

  if (command === 'read_config') {
    echoConfig(
      `growbox/${alias}/config`,
      JSON.stringify({ simulation: true, interval_ms: intervals[alias] ?? 60000 }),
    );
    return;
  }

  if (command === 'config') {
    if (recentEcho.get(topic) === msg) return; // es nuestro propio eco
    try {
      JSON.parse(msg);
    } catch {
      return; // configuración inválida: se ignora
    }
    echoConfig(topic, msg); // confirmar "aplicada" (como hace el firmware)
  }
});

client.on('error', (err) => log('error MQTT:', err.message));

// Los temporizadores se registran UNA sola vez, FUERA del handler 'connect': si
// se registraran ahí, cada reconexión añadiría timers nuevos y multiplicaría las
// publicaciones (satura el broker y la base de datos).
setInterval(stepEnvironment, 1000); // evolución del ambiente (física)
for (const [alias, ms] of Object.entries(intervals)) {
  setInterval(() => {
    if (client.connected) publishTelemetry(alias);
  }, ms);
}
setInterval(() => {
  if (client.connected) publishRelayAll();
}, RELAY_INTERVAL_MS);

function shutdown() {
  log('deteniendo (publicando offline)…');
  try {
    client.publish('growbox/status', 'offline', { retain: true });
  } catch {
    /* ya cerrado */
  }
  client.end(false, {}, () => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
