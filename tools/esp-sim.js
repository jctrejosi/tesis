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
 *   SIM_INTERVAL_SOIL_EC_MS, SIM_INTERVAL_RELAY_MS
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

// Métricas con los mismos nombres que publica el firmware (formulas de
// backend/src/derivates/formulas/*.ts dependen de ellas).
const generators = {
  bme680: () => ({
    temperature: drift(24, 1.5),
    humidity: drift(60, 5),
    pressure: drift(1013, 2),
    gas_resistance: Math.round(drift(400, 40)),
  }),
  as7341: () => ({
    f1_415nm: Math.round(drift(2200, 800)),
    f2_445nm: Math.round(drift(2500, 800)),
    f3_480nm: Math.round(drift(2700, 800)),
    f4_515nm: Math.round(drift(3600, 900)),
    f5_555nm: Math.round(drift(1200, 600)),
    f6_590nm: Math.round(drift(2100, 700)),
    f7_630nm: Math.round(drift(1600, 700)),
    f8_680nm: Math.round(drift(3000, 900)),
    clear: Math.round(drift(11700, 2000)),
    nir: Math.round(drift(3700, 800)),
  }),
  mhz19b: () => ({ co2: Math.round(drift(850, 120)) }),
  soil_ec: () => ({ ec: drift(1.5, 0.4), temperature: drift(22, 2) }),
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
