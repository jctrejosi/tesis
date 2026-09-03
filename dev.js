#!/usr/bin/env node
'use strict';

/* =====================================================================
 * dev.js — Levanta el entorno completo del proyecto de tesis
 *
 *  1. TimescaleDB + Mosquitto MQTT   docker compose (./db)
 *  2. Backend NestJS                 ./backend       http://localhost:3000
 *  3. Interfaz web (Vite)            ./interfaz web  http://localhost:5173
 *  4. plant-service (FastAPI)        ./plant-service http://localhost:8000
 *  5. ESP32 (PlatformIO)             ./esp32         build + upload [+ monitor]
 *
 * Requisitos: Node >= 18, Docker, Yarn (o npm) y PlatformIO (pio) para el
 * ESP32. Si `pio` no está instalado, el script levanta el resto del entorno
 * y avisa al final.
 *
 * Cuando todo está corriendo, dev.js termina y cierra la terminal: los
 * servicios quedan en segundo plano (propia sesión) escribiendo su salida en
 * ./logs/*.log, y se detienen con `node dev.js --stop`. Con --keep-terminal
 * (o un modo con monitor serial) la terminal queda abierta y Ctrl+C detiene
 * todo.
 *
 * Uso: node dev.js [opciones]   (o `npm run dev` en la raíz)
 * ===================================================================== */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');

/* ------------------------------ rutas ------------------------------- */

const ROOT = __dirname;
const DB_DIR = path.join(ROOT, 'db');
const BACKEND_DIR = path.join(ROOT, 'backend');
const WEB_DIR = path.join(ROOT, 'interfaz web');
const PLANT_DIR = path.join(ROOT, 'plant-service');
const ESP32_DIR = path.join(ROOT, 'esp32');
const LOG_DIR = path.join(ROOT, 'logs');
const MONITOR_SPEED = 115200;
const PLANT_PORT = 8000;

fs.mkdirSync(LOG_DIR, { recursive: true });

const BACKEND_ENV_DEFAULT = [
  'DATABASE_URL=postgresql://cea_user:cea_password@localhost:5438/cea_db',
  'MQTT_BROKER_URL=mqtt://localhost:1883',
  'MQTT_CLIENT_ID=cea_backend',
  '',
].join('\n');

/* ---------------------------- utilidades ---------------------------- */

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const paint = (c, s) =>
  process.stdout.isTTY ? `${COLORS[c]}${s}${COLORS.reset}` : s;

const stripAnsi = (s) => s.replace(/\u001b\[[0-9;]*m/g, '');

const log = (tag, msg) => {
  const time = new Date().toLocaleTimeString();
  process.stdout.write(`${paint('dim', time)} ${paint('cyan', `[${tag}]`)} ${msg}\n`);
  fs.appendFileSync(path.join(LOG_DIR, 'dev.log'), `${time} [${tag}] ${stripAnsi(msg)}\n`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function which(cmd) {
  const exts = process.platform === 'win32' ? ['', '.cmd', '.exe', '.bat'] : [''];
  const dirs = (process.env.PATH || '').split(path.delimiter);
  for (const dir of dirs) {
    if (!dir) continue;
    for (const ext of exts) {
      const full = path.join(dir, cmd + ext);
      try {
        fs.accessSync(full, fs.constants.X_OK);
        return full;
      } catch {
        /* sigue buscando */
      }
    }
  }
  return null;
}

function detectPm(dir) {
  if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(dir, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(dir, 'package-lock.json'))) return 'npm';
  return null;
}

// Devuelve el ejecutable y el estilo de invocación de scripts para un dir.
function resolveRunner(dir) {
  const pm = detectPm(dir);
  const bin = pm ? which(pm) : null;
  if (bin) return { bin, style: 'yarn' }; // yarn y pnpm: `yarn <script>`
  const npm = which('npm');
  if (npm) return { bin: npm, style: 'npm' }; // npm: `npm run <script>`
  return null;
}

const scriptArgs = (runner, script) =>
  runner.style === 'npm' ? ['run', script] : [script];

function findPio() {
  const home = os.homedir();
  const exe = process.platform === 'win32' ? 'pio.exe' : 'pio';
  const candidates = [
    which('pio'),
    which('platformio'),
    path.join(home, '.platformio', 'penv', 'bin', exe), // extensión PlatformIO IDE
    path.join(home, '.local', 'bin', exe),
  ];
  return candidates.find((c) => c && fs.existsSync(c)) || null;
}

function lanIPv4() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const it of list || []) {
      if (it.family === 'IPv4' && !it.internal) return it.address;
    }
  }
  return null;
}

/* ----------------------- plant-service (Python) ------------------------ */

function findPython() {
  return (
    which('python3') ||
    which('python') ||
    (process.platform === 'win32' && which('py')) ||
    null
  );
}

function plantVenvPython() {
  const exe = process.platform === 'win32' ? 'python.exe' : 'python';
  const candidate = path.join(PLANT_DIR, '.venv', process.platform === 'win32' ? 'Scripts' : 'bin', exe);
  return fs.existsSync(candidate) ? candidate : null;
}

function plantDepsOk() {
  const python = plantVenvPython();
  if (!python) return false;
  const r = spawnSync(python, ['-c', 'import fastapi, uvicorn, sqlalchemy, httpx'], { cwd: PLANT_DIR, stdio: 'ignore', timeout: 15000 });
  return r.status === 0;
}

// Crea .env a partir del ejemplo si no existe y avisa si falta la API key.
function ensurePlantEnv() {
  const envPath = path.join(PLANT_DIR, '.env');
  const examplePath = path.join(PLANT_DIR, '.env.example');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const keyLine = content.match(/^DEEPSEEK_API_KEY\s*=\s*(\S*)$/m);
    if (!keyLine || !keyLine[1]) {
      log('plant', paint('yellow', 'DEEPSEEK_API_KEY vacía en .env: las recomendaciones IA no funcionarán (el resto del servicio sí).'));
    }
    return;
  }
  if (!fs.existsSync(examplePath)) {
    log('plant', paint('yellow', 'no existe .env.example; crea plant-service/.env manualmente'));
    return;
  }
  fs.copyFileSync(examplePath, envPath);
  log('plant', `creado ${path.relative(ROOT, envPath)} a partir de .env.example`);
  log('plant', paint('yellow', 'Revisa plant-service/.env: define DEEPSEEK_API_KEY y cambia DEVICE_API_KEY.'));
}

/* ----------------------------- opciones ----------------------------- */

const HELP = `
dev.js — Levanta el entorno completo del proyecto de tesis

  db/docker-compose.yml  TimescaleDB (5432) + Mosquitto MQTT (1883, 9001)
  backend/               API NestJS en http://localhost:3000 (Swagger en /api/docs)
  interfaz web/          Dev server Vite en http://localhost:5173
  plant-service/         FastAPI en http://localhost:8000 (docs en /docs)
  esp32/                 Firmware PlatformIO (build + upload [+ monitor serial])

Uso:
  node dev.js                     Levanta todo (db → backend → web → plant → esp32)
  node dev.js --skip-esp32        Todo excepto el ESP32 (sin placa conectada)
  node dev.js --monitor           Sube el firmware y abre el monitor serial
  node dev.js --monitor-only      Solo abre el monitor serial del ESP32
  node dev.js --build-only        Compila el firmware ESP32 sin subirlo
  node dev.js --stop              Detiene los servicios en segundo plano (logs/*.pid)
  node dev.js --down              Apaga también los contenedores docker

Notas:
  Cuando todo está corriendo, dev.js termina y cierra la terminal: los
  servicios siguen vivos en segundo plano escribiendo sus logs en logs/
  (backend.log, web.log, db.log, mqtt.log, …). Para detenerlos después:
  node dev.js --stop  (y \`npm run down\` para los contenedores docker).
  --keep-terminal (o un modo con monitor serial) deja la terminal abierta,
  donde Ctrl+C detiene todo.

Opciones:
  --skip-db, --skip-backend, --skip-web, --skip-plantservice, --skip-esp32   Omite un componente
  --env <nombre>         Entorno de PlatformIO (por defecto: esp32dev)
  --upload-port <p>      Puerto serie para subir el firmware (ej. /dev/ttyUSB0)
  --monitor-port <p>     Puerto serie para el monitor serial
  --baud <n>             Baud rate del monitor (por defecto: 115200)
  --watch                Backend en modo watch (por defecto)
  --prod                 Backend compilado (yarn build + node dist/main)
  --install              Fuerza la instalación de dependencias aunque no falten
  --skip-install         Omite la instalación (por defecto instala solo si faltan)
  --keep-terminal        Mantiene la terminal abierta (Ctrl+C detiene los servicios)
  -h, --help             Muestra esta ayuda
`;

const opts = {
  skipDb: false,
  skipBackend: false,
  skipWeb: false,
  skipPlantservice: false,
  skipEsp32: false,
  buildOnly: false,
  monitor: false,
  monitorOnly: false,
  env: 'esp32dev',
  uploadPort: null,
  monitorPort: null,
  baud: MONITOR_SPEED,
  prod: false,
  install: false,
  skipInstall: false,
  down: false,
  stop: false,
  closeTerminal: true,
};

function parseArgs(argv) {
  const next = () => argv[++i];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '-h':
      case '--help':
        console.log(HELP);
        process.exit(0);
        break;
      case '--skip-db':
      case '--no-db':
        opts.skipDb = true;
        break;
      case '--skip-backend':
      case '--no-backend':
        opts.skipBackend = true;
        break;
      case '--skip-web':
      case '--no-web':
        opts.skipWeb = true;
        break;
      case '--skip-plantservice':
      case '--no-plantservice':
        opts.skipPlantservice = true;
        break;
      case '--skip-esp32':
      case '--no-esp32':
        opts.skipEsp32 = true;
        break;
      case '--build-only':
        opts.buildOnly = true;
        break;
      case '--monitor':
        opts.monitor = true;
        break;
      case '--monitor-only':
        opts.monitorOnly = true;
        break;
      case '--env':
        opts.env = next() || opts.env;
        break;
      case '--upload-port':
        opts.uploadPort = next() || null;
        break;
      case '--monitor-port':
        opts.monitorPort = next() || null;
        break;
      case '--baud':
        opts.baud = parseInt(next(), 10) || MONITOR_SPEED;
        break;
      case '--watch':
        opts.prod = false;
        break;
      case '--prod':
        opts.prod = true;
        break;
      case '--install':
        opts.install = true;
        break;
      case '--skip-install':
        opts.skipInstall = true;
        break;
      case '--down':
        opts.down = true;
        break;
      case '--stop':
        opts.stop = true;
        break;
      case '--keep-terminal':
        opts.closeTerminal = false;
        break;
      default:
        log('dev', paint('yellow', `Opción desconocida: ${a} (usa --help)`));
    }
  }
}

/* ------------------------ gestión de procesos ----------------------- */

const children = new Set();
let shuttingDown = false;

function prefixOutput(child, name, color = 'cyan') {
  const tag = paint(color, `[${name}]`);
  const fileStream = fs.createWriteStream(path.join(LOG_DIR, `${name}.log`), { flags: 'a' });
  const emit = (line) => {
    if (!line) return;
    process.stdout.write(`${tag} ${line}\n`);
    if (fileStream.writable) fileStream.write(`${line}\n`);
  };
  const drain = (stream) => {
    if (!stream) return;
    let buf = '';
    stream.on('data', (chunk) => {
      buf += chunk.toString();
      let idx;
      while ((idx = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, idx).trimEnd();
        buf = buf.slice(idx + 1);
        emit(line);
      }
    });
    stream.on('end', () => emit(buf.trimEnd()));
  };
  drain(child.stdout);
  drain(child.stderr);
  child.once('exit', () => fileStream.end());
}

// Mata todo el grupo de procesos del hijo (evita huérfanos tipo nest/vite).
function killTree(child, signal = 'SIGTERM') {
  try {
    if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      /* ya terminó */
    }
  }
}

// Proceso de larga duración: corre desacoplado de dev.js (propia sesión) y
// escribe su salida directamente a logs/<name>.log (pid en logs/<name>.pid).
// Así sobrevive a la salida de dev.js y al cierre de la terminal; se detiene
// luego con `node dev.js --stop`.
function startService(name, cmd, args, cwd, { fatal = true } = {}) {
  const logPath = path.join(LOG_DIR, `${name}.log`);
  const outFd = fs.openSync(logPath, 'a');
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env },
    stdio: ['ignore', outFd, outFd],
    detached: process.platform !== 'win32',
  });
  fs.closeSync(outFd); // el hijo conserva su propia copia del descriptor
  fs.writeFileSync(path.join(LOG_DIR, `${name}.pid`), String(child.pid));
  children.add(child);
  log(name, `arrancando (pid ${child.pid}; salida → logs/${name}.log)`);
  child.on('exit', (code, signal) => {
    children.delete(child);
    try {
      fs.unlinkSync(path.join(LOG_DIR, `${name}.pid`));
    } catch {
      /* ya no existe */
    }
    if (!shuttingDown && fatal && code !== null) {
      log('dev', paint('red', `${name} terminó (código ${code ?? signal}). Deteniendo el entorno.`));
      void shutdown(1);
    }
  });
  return child;
}

// Comando finito: resuelve con el código de salida.
function runOnce(name, cmd, args, cwd, color = 'blue') {
  return new Promise((resolve) => {
    log(name, `${cmd} ${args.join(' ')}`);
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.add(child);
    prefixOutput(child, name, color);
    child.on('exit', (code, signal) => {
      children.delete(child);
      resolve(code === null ? -1 : code);
    });
  });
}

/* ------------------------------ esperas ----------------------------- */

async function waitFor(name, fn, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (await fn()) {
        log(name, paint('green', 'listo ✓'));
        return true;
      }
    } catch {
      /* reintentar */
    }
    await sleep(1200);
  }
  log(name, paint('yellow', `no respondió a tiempo (${Math.round(timeoutMs / 1000)}s)`));
  return false;
}

function tcpReachable(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host });
    sock.setTimeout(1500);
    const done = (ok) => {
      sock.destroy();
      resolve(ok);
    };
    sock.once('connect', () => done(true));
    sock.once('error', () => done(false));
    sock.once('timeout', () => done(false));
  });
}

async function httpOk(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

function dbReady() {
  const r = spawnSync(
    'docker',
    ['exec', 'cea-timescaledb', 'pg_isready', '-U', 'cea_user', '-d', 'cea_db'],
    { stdio: 'ignore', timeout: 8000 },
  );
  return r.status === 0;
}

// Avisa si el esquema no está inicializado (p. ej. volumen docker viejo).
function dbSchemaCheck() {
  const r = spawnSync(
    'docker',
    [
      'exec', 'cea-timescaledb', 'psql', '-U', 'cea_user', '-d', 'cea_db',
      '-tAc', "SELECT to_regclass('public.devices')",
    ],
    { stdio: ['ignore', 'pipe', 'pipe'], timeout: 8000 },
  );
  const out = (r.stdout || '').toString().trim();
  if (out !== 'devices') {
    log('db', paint('yellow', 'la tabla "devices" no existe. Si usas un volumen antiguo, ejecuta "docker compose down -v" en ./db para que corra init.sql.'));
  }
}

// Espera a que el dev server de Vite responda (puerto por defecto 5173).
async function waitForWeb() {
  const ok = await waitFor('web', () => httpOk('http://localhost:5173'), 60000);
  return ok ? 'http://localhost:5173' : null;
}

/* --------------------------- pasos del flujo ------------------------ */

function ensureBackendEnv() {
  const envPath = path.join(BACKEND_DIR, '.env');
  if (fs.existsSync(envPath)) {
    log('backend', `usa .env existente (${path.relative(ROOT, envPath)})`);
    return;
  }
  fs.writeFileSync(envPath, BACKEND_ENV_DEFAULT);
  log('backend', `creado ${path.relative(ROOT, envPath)} con credenciales por defecto`);
}

async function installDeps(dir, label) {
  const pm = detectPm(dir);
  if (!pm) {
    log(label, 'sin lockfile detectable, se omite la instalación');
    return true;
  }
  // Prefiere el gestor del lockfile; si no está en el PATH (p. ej. yarn
  // ausente), cae a npm para que la instalación siempre pueda ejecutarse.
  const bin = which(pm) || which('npm');
  if (!bin) {
    log(label, paint('yellow', `${pm} ni npm están en el PATH`));
    return false;
  }
  const code = await runOnce(label, bin, ['install'], dir);
  if (code !== 0) log(label, paint('yellow', 'la instalación de dependencias falló'));
  return code === 0;
}

// En ./interfaz web, react y react-dom son peerDependencies opcionales, por lo
// que pueden faltar aunque node_modules exista. La app no arranca sin ellos.
function webDepsOk() {
  const nm = path.join(WEB_DIR, 'node_modules');
  return (
    fs.existsSync(path.join(nm, 'react')) && fs.existsSync(path.join(nm, 'react-dom'))
  );
}

// Avisa si el broker configurado en el firmware no coincide con la IP LAN.
function esp32BrokerHint() {
  const cfg = path.join(ESP32_DIR, 'include', 'app_config.h');
  if (!fs.existsSync(cfg)) return;
  const src = fs.readFileSync(cfg, 'utf8');
  const m = src.match(/MQTT_BROKER\s+"([^"]+)"/);
  const ip = lanIPv4();
  if (m && ip && m[1] !== ip) {
    log(
      'esp32',
      paint(
        'yellow',
        `app_config.h apunta al broker ${m[1]}, pero la IP LAN de esta máquina es ${ip}. ` +
          `Si el ESP32 se conecta a la misma red, ajusta MQTT_BROKER a ${ip} y vuelve a subir el firmware.`,
      ),
    );
  }
}

let PIO_BIN = null;

function startMonitor() {
  const args = ['device', 'monitor', '-b', String(opts.baud)];
  if (opts.monitorPort) args.push('-p', opts.monitorPort);
  log('esp32', `abriendo monitor serial (${args.join(' ')})`);
  const child = spawn(PIO_BIN, args, {
    cwd: ESP32_DIR,
    stdio: 'inherit',
    detached: process.platform !== 'win32',
  });
  children.add(child);
  fs.writeFileSync(path.join(LOG_DIR, 'monitor.pid'), String(child.pid));
  child.on('exit', (code) => {
    children.delete(child);
    try {
      fs.unlinkSync(path.join(LOG_DIR, 'monitor.pid'));
    } catch {
      /* ya no existe */
    }
    if (!shuttingDown) log('esp32', `monitor serial cerrado (código ${code})`);
  });
  return child;
}

function printSummary(webUrl) {
  console.log('');
  console.log(paint('green', '================================================='));
  console.log(paint('green', '  Entorno levantado'));
  console.log(paint('green', '================================================='));
  if (!opts.skipBackend) {
    console.log('  Backend API   ->  http://localhost:3000');
    console.log('  Swagger UI    ->  http://localhost:3000/api/docs');
    console.log('  Health check  ->  http://localhost:3000/health');
  }
  if (!opts.skipWeb) {
    console.log(`  Interfaz web  ->  ${webUrl || 'http://localhost:5173 (revisa el log de vite)'}`);
  }
  if (!opts.skipPlantservice) {
    console.log(`  plant-service ->  http://localhost:${PLANT_PORT}  (docs: http://localhost:${PLANT_PORT}/docs)`);
  }
  if (!opts.skipEsp32) {
    console.log(
      `  ESP32         ->  ${opts.monitorOnly ? 'monitor serial abierto' : 'firmware compilado' + (opts.buildOnly ? ' (sin subir)' : ' y subido')}`,
    );
  }
  console.log('');
  const keepOpen = opts.monitor || opts.monitorOnly || !opts.closeTerminal;
  console.log(
    paint(
      'dim',
      keepOpen
        ? '  Ctrl+C para detener todo. Logs en logs/.'
        : '  Los servicios siguen en segundo plano (logs en logs/). Para detenerlos: node dev.js --stop',
    ),
  );
  console.log('');
}

/* ------------------------- cierre de la terminal ---------------------- */

// Nombre (comm) de un proceso dado (Linux vía /proc; macOS vía ps).
function procComm(pid) {
  try {
    if (process.platform === 'linux') return fs.readFileSync(`/proc/${pid}/comm`, 'utf8').trim();
    const r = spawnSync('ps', ['-o', 'comm=', '-p', String(pid)], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 3000 });
    return (r.stdout || '').toString().trim();
  } catch {
    return null;
  }
}

// PID del padre de un proceso.
function procParent(pid) {
  try {
    if (process.platform === 'linux') {
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      const m = stat.match(/\)\s+\w\s+(\d+)/); // tras el comm: estado + ppid
      return m ? Number(m[1]) : null;
    }
    const r = spawnSync('ps', ['-o', 'ppid=', '-p', String(pid)], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 3000 });
    const n = parseInt((r.stdout || '').toString().trim(), 10);
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

const SHELL_NAMES = new Set(['bash', 'zsh', 'fish', 'dash', 'sh', 'ksh', 'csh', 'tcsh']);

// Sube por la cadena de procesos hasta la shell de la terminal que lanzó
// dev.js (si se ejecutó vía npm/yarn, el padre es node; más arriba está la shell).
function terminalShellPid() {
  if (process.platform === 'win32') return process.ppid;
  let pid = process.ppid;
  for (let depth = 0; pid && pid > 1 && depth < 16; depth++) {
    const name = procComm(pid);
    if (name && SHELL_NAMES.has(name)) return pid;
    pid = procParent(pid);
  }
  return process.ppid;
}

// Lanza un helper desacoplado que cerrará la terminal cuando este proceso muera.
function scheduleTerminalClose() {
  const target = terminalShellPid();
  const child = spawn(process.execPath, [__filename], {
    stdio: 'ignore',
    detached: true,
    env: { ...process.env, DEV_TERM_CLOSE_PID: String(target) },
  });
  child.unref();
  log('dev', paint('dim', `la terminal se cerrará al salir (pid ${target}; usa --keep-terminal para evitarlo)`));
}

/* ----------------------------- apagado ------------------------------ */

function cleanupPidFiles() {
  if (!fs.existsSync(LOG_DIR)) return;
  for (const f of fs.readdirSync(LOG_DIR)) {
    if (f.endsWith('.pid')) {
      try {
        fs.unlinkSync(path.join(LOG_DIR, f));
      } catch {
        /* ya no existe */
      }
    }
  }
}

// Detiene los servicios que una corrida anterior dejó en segundo plano.
async function stopBackgroundServices() {
  if (!fs.existsSync(LOG_DIR)) return;
  const signaled = [];
  for (const f of fs.readdirSync(LOG_DIR)) {
    if (!f.endsWith('.pid')) continue;
    const name = f.slice(0, -4);
    try {
      const pid = Number.parseInt(fs.readFileSync(path.join(LOG_DIR, f), 'utf8'), 10);
      if (!Number.isInteger(pid) || pid <= 1) continue;
      // Termina el grupo del proceso (cubre hijos anidados tipo nest/vite).
      if (process.platform !== 'win32') {
        try {
          process.kill(-pid, 'SIGTERM');
        } catch {
          try {
            process.kill(pid, 'SIGTERM');
          } catch {
            continue; // ya terminó
          }
        }
      } else {
        try {
          process.kill(pid, 'SIGTERM');
        } catch {
          continue; // ya terminó
        }
      }
      signaled.push({ name, pid });
      log('dev', `detenido ${name} (pid ${pid})`);
    } catch {
      /* pid ilegible */
    }
  }
  if (!signaled.length) {
    log('dev', 'no hay servicios en segundo plano (logs/*.pid)');
    return;
  }
  await sleep(1500);
  for (const { name, pid } of signaled) {
    try {
      if (process.platform !== 'win32') process.kill(-pid, 'SIGKILL');
      else process.kill(pid, 'SIGKILL');
    } catch {
      /* ya terminó */
    }
    try {
      fs.unlinkSync(path.join(LOG_DIR, `${name}.pid`));
    } catch {
      /* ya no existe */
    }
  }
}

async function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('');
  log('dev', paint('yellow', 'Deteniendo servicios…'));
  for (const c of [...children]) killTree(c);
  await sleep(2500);
  for (const c of [...children]) killTree(c, 'SIGKILL');
  cleanupPidFiles();
  if (opts.down) {
    const r = await runOnce('db', 'docker', ['compose', 'down'], DB_DIR, 'blue');
    if (r === 0) log('db', 'contenedores docker apagados');
  }
  if (code === 0 && opts.closeTerminal && process.stdin.isTTY) {
    scheduleTerminalClose();
    await sleep(300); // deja que la salida final se vacíe antes de morir
  }
  process.exit(code);
}

/* -------------------------------- main ------------------------------ */

async function main() {
  console.log(paint('magenta', '='.repeat(64)));
  console.log(paint('magenta', '  Entorno completo — Sistema de cultivo automatizado (tesis)'));
  console.log(paint('magenta', '='.repeat(64)));

  // 0. Detener los servicios que una corrida anterior dejó en segundo plano.
  if (opts.stop) {
    await stopBackgroundServices();
    process.exit(0);
  }

  const parts = [];
  if (!opts.skipDb) parts.push('DB + MQTT (docker)');
  if (!opts.skipBackend) parts.push('Backend NestJS');
  if (!opts.skipWeb) parts.push('Interfaz web (Vite)');
  if (!opts.skipPlantservice) parts.push('plant-service (FastAPI)');
  if (!opts.skipEsp32) parts.push('ESP32 (PlatformIO)');
  if (parts.length) log('dev', `Se levantarán: ${parts.join(', ')}`);

  // Caso especial: solo se pidió apagar docker.
  if (opts.down && !parts.length) {
    const r = await runOnce('db', 'docker', ['compose', 'down'], DB_DIR, 'blue');
    process.exit(r === 0 ? 0 : 1);
  }
  if (!parts.length) {
    log('dev', paint('red', 'No hay nada que levantar (usa --help)'));
    process.exit(1);
  }

  // Prerrequisitos.
  if (!opts.skipDb && !which('docker')) {
    log('dev', paint('red', 'docker no está en el PATH. Instálalo o usa --skip-db.'));
    process.exit(1);
  }
  const backendRunner = !opts.skipBackend ? resolveRunner(BACKEND_DIR) : null;
  const webRunner = !opts.skipWeb ? resolveRunner(WEB_DIR) : null;
  if (!opts.skipBackend && !backendRunner) {
    log('dev', paint('red', 'No se encontró yarn ni npm para levantar el backend.'));
    process.exit(1);
  }
  if (!opts.skipWeb && !webRunner) {
    log('dev', paint('red', 'No se encontró yarn ni npm para levantar la interfaz web.'));
    process.exit(1);
  }
  let pythonBin = null;
  if (!opts.skipPlantservice) {
    pythonBin = findPython();
    if (!pythonBin) {
      log('dev', paint('red', 'No se encontró Python 3 para levantar plant-service. Instálalo o usa --skip-plantservice.'));
      process.exit(1);
    }
  }
  PIO_BIN = null;
  if (!opts.skipEsp32) {
    PIO_BIN = findPio();
    if (!PIO_BIN) {
      log('esp32', paint('yellow', 'PlatformIO (pio) no encontrado: se omite el ESP32.'));
      log('esp32', paint('dim', '  Instálalo con:  pip install -U platformio'));
      log('esp32', paint('dim', '  o usa la extensión "PlatformIO IDE" de VS Code y vuelve a intentarlo.'));
      opts.skipEsp32 = true;
    }
  }

  // 1. .env del backend (no pisa uno existente).
  if (!opts.skipBackend) ensureBackendEnv();

  // 2. Base de datos + broker MQTT.
  if (!opts.skipDb) {
    const up = await runOnce('db', 'docker', ['compose', 'up', '-d'], DB_DIR, 'blue');
    if (up !== 0) {
      log('dev', paint('red', 'No se pudo levantar docker compose. Corrige el error o usa --skip-db.'));
      log('dev', paint('dim', '  Si el error es "port is already allocated", otro servicio ocupa un puerto:'));
      log('dev', paint('dim', '  ajusta los puertos en db/docker-compose.yml y las DATABASE_URL correspondientes.'));
      process.exit(1);
    }
    await waitFor('db', dbReady, 180000);
    dbSchemaCheck();
    await waitFor('mqtt', () => tcpReachable(1883), 30000);
    // Vuelca los logs de los contenedores a logs/db.log y logs/mqtt.log.
    startService('db', 'docker', ['logs', '-f', 'cea-timescaledb'], DB_DIR, { fatal: false });
    startService('mqtt', 'docker', ['logs', '-f', 'cea-mqtt'], DB_DIR, { fatal: false });
  }

  // 3. Dependencias (solo si faltan o con --install).
  if (!opts.skipInstall) {
    if (
      !opts.skipBackend &&
      (opts.install || !fs.existsSync(path.join(BACKEND_DIR, 'node_modules')))
    ) {
      await installDeps(BACKEND_DIR, 'backend');
    }
    if (
      !opts.skipWeb &&
      (opts.install ||
        !fs.existsSync(path.join(WEB_DIR, 'node_modules')) ||
        !webDepsOk())
    ) {
      await installDeps(WEB_DIR, 'web');
    }
  }

  // 4. Backend NestJS.
  let webUrl = null;
  if (!opts.skipBackend) {
    if (opts.prod) {
      const b = await runOnce('backend', backendRunner.bin, scriptArgs(backendRunner, 'build'), BACKEND_DIR, 'magenta');
      if (b !== 0) {
        log('dev', paint('red', 'El build del backend falló.'));
        process.exit(1);
      }
      startService('backend', process.execPath, ['dist/main'], BACKEND_DIR);
    } else {
      startService('backend', backendRunner.bin, scriptArgs(backendRunner, 'start:dev'), BACKEND_DIR);
    }
    await waitFor('backend', () => httpOk('http://localhost:3000/health'), 120000);
  }

  // 5. Interfaz web (Vite).
  if (!opts.skipWeb) {
    startService('web', webRunner.bin, scriptArgs(webRunner, 'dev'), WEB_DIR);
    webUrl = await waitForWeb();
  }

  // 6. plant-service (FastAPI): venv + dependencias + uvicorn.
  if (!opts.skipPlantservice) {
    ensurePlantEnv();
    let venvPython = plantVenvPython();
    if (!venvPython) {
      log('plant', 'creando entorno virtual (.venv)…');
      const venvCode = await runOnce('plant', pythonBin, ['-m', 'venv', '.venv'], PLANT_DIR, 'cyan');
      venvPython = venvCode === 0 ? plantVenvPython() : null;
      if (!venvPython) {
        log('dev', paint('red', 'No se pudo crear el venv de plant-service.'));
        process.exit(1);
      }
    }
    if (!opts.skipInstall && (opts.install || !plantDepsOk())) {
      const pipCode = await runOnce('plant', venvPython, ['-m', 'pip', 'install', '-r', 'requirements.txt'], PLANT_DIR, 'cyan');
      if (pipCode !== 0) {
        log('dev', paint('red', 'La instalación de dependencias de plant-service falló.'));
        process.exit(1);
      }
    }
    startService('plant', venvPython, ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', String(PLANT_PORT)], PLANT_DIR);
    await waitFor('plant', () => httpOk(`http://localhost:${PLANT_PORT}/api/v1/health`), 60000);
  }

  // 7. ESP32 (PlatformIO): build → upload → monitor opcional.
  if (!opts.skipEsp32) {
    esp32BrokerHint();
    if (opts.monitorOnly) {
      startMonitor();
    } else {
      const built = await runOnce('esp32', PIO_BIN, ['run', '-e', opts.env], ESP32_DIR, 'yellow');
      if (built !== 0) {
        log('esp32', paint('red', 'La compilación del firmware falló.'));
      } else if (!opts.buildOnly) {
        const uploadArgs = ['run', '-e', opts.env, '-t', 'upload'];
        if (opts.uploadPort) uploadArgs.push('--upload-port', opts.uploadPort);
        const uploaded = await runOnce('esp32', PIO_BIN, uploadArgs, ESP32_DIR, 'yellow');
        if (uploaded !== 0) {
          log('esp32', paint('red', 'La subida falló. Revisa la conexión USB y el puerto (--upload-port).'));
        } else if (opts.monitor) {
          startMonitor();
        } else {
          log('esp32', paint('dim', 'Usa --monitor para ver la salida serial del ESP32.'));
        }
      } else {
        log('esp32', 'Firmware compilado (--build-only, sin subir).');
      }
    }
  }

  printSummary(webUrl);

  // ¿Hay que dejar la terminal abierta? (monitor serial o --keep-terminal).
  const keepOpen = opts.monitor || opts.monitorOnly || !opts.closeTerminal;
  if (keepOpen) {
    log('dev', paint('dim', 'Servicios arriba. Ctrl+C para detenerlos (logs en logs/).'));
    setInterval(() => {}, 2147483647); // mantiene vivo el proceso hasta Ctrl+C
    return;
  }

  // Todo corriendo: dev.js termina y cierra la terminal. Los servicios ya
  // corren en su propia sesión con salida a logs/*.log, así que sobreviven.
  await sleep(800); // deja que la salida final se vacíe
  log('dev', paint('green', 'Entorno corriendo en segundo plano. Cerrando la terminal…'));
  if (process.stdin.isTTY) scheduleTerminalClose();
  process.exit(0);
}

if (process.env.DEV_TERM_CLOSE_PID) {
  // Helper desacoplado lanzado por scheduleTerminalClose(): termina la shell
  // de la terminal (o el proceso padre, en Windows) un instante después de
  // que dev.js haya salido por completo.
  const target = Number(process.env.DEV_TERM_CLOSE_PID) || process.ppid;
  const force = () => {
    if (process.platform !== 'win32') {
      try { process.kill(target, 'SIGKILL'); } catch { /* ya terminó */ }
    }
    process.exit(0);
  };
  setTimeout(() => {
    if (process.platform === 'win32') {
      try { spawnSync('taskkill', ['/F', '/T', '/PID', String(target)], { stdio: 'ignore' }); } catch { /* ya terminó */ }
      process.exit(0);
    }
    try { process.kill(target, 'SIGTERM'); } catch { /* ya terminó */ }
    setTimeout(force, 1500);
  }, 600);
} else {
  process.on('SIGINT', () => void shutdown(0));
  process.on('SIGTERM', () => void shutdown(0));

  parseArgs(process.argv.slice(2));
  void main();
}
