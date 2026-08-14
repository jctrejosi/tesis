import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Thermometer, Droplets, Wind, Sun, Leaf, Zap,
  LayoutDashboard, Settings, Server, Bell,
  Power, Fan, Activity, BarChart2, Sliders,
  TrendingUp, TrendingDown, Filter, ChevronRight,
  ChevronDown, Menu, Clock, RefreshCw, Lightbulb,
  Cpu, Radio,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

type Page = "dashboard" | "sensors" | "sensor-detail" | "actuators" | "config" | "devices";
type SensorTab = "readings" | "charts" | "config";
type FreshStatus = "fresh" | "stale" | "offline";

interface SparkPoint { t: number; v: number }

interface KpiMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  color: string;
  sparkline: SparkPoint[];
  variance: number;
  sensorAlias: string;
  decimals: number;
}

interface SensorReading {
  channel: string;
  value: number;
  unit: string;
  wavelength?: string;
  barColor?: string;
}

interface Sensor {
  alias: string;
  name: string;
  model: string;
  type: string;
  status: "connected" | "disconnected";
  lastSeen: string;
  readings: SensorReading[];
}

interface ActuatorChannel {
  id: number;
  label: string;
  state: boolean;
}

interface Actuator {
  id: string;
  name: string;
  type: "relay" | "fan" | "light" | "pump";
  icon: React.ComponentType<{ size?: number; className?: string }>;
  channels?: ActuatorChannel[];
  state: boolean;
}

// ─── Mock data generators ───────────────────────────────────────────────────

const rnd = (base: number, v: number) => base + (Math.random() - 0.5) * v * 2;

const makeSparkline = (base: number, variance: number, n = 24): SparkPoint[] =>
  Array.from({ length: n }, (_, i) => ({ t: i, v: rnd(base, variance) }));

const makeHistory = (base: number, variance: number, steps = 48) => {
  const now = Date.now();
  return Array.from({ length: steps }, (_, i) => {
    const d = new Date(now - (steps - i) * 30 * 60 * 1000);
    return {
      time: d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
      value: Math.round(rnd(base, variance) * 100) / 100,
    };
  });
};

// ─── Static data ────────────────────────────────────────────────────────────

const INITIAL_KPI: KpiMetric[] = [
  { id: "temp_air", label: "Temperatura Aire", value: 24.5, unit: "°C", icon: Thermometer, color: "#F59E0B", variance: 0.6, sensorAlias: "bme680_main", decimals: 1, sparkline: makeSparkline(24.5, 0.6) },
  { id: "humidity", label: "Humedad Relativa", value: 62.3, unit: "%",  icon: Droplets,    color: "#3B82F6", variance: 1.8, sensorAlias: "bme680_main", decimals: 1, sparkline: makeSparkline(62.3, 1.8) },
  { id: "co2",      label: "CO₂",              value: 812,  unit: "ppm", icon: Wind,        color: "#8B5CF6", variance: 18,  sensorAlias: "co2_main",    decimals: 0, sparkline: makeSparkline(812, 18) },
  { id: "light",    label: "Iluminación",       value: 3421, unit: "lux", icon: Sun,         color: "#FBBF24", variance: 120, sensorAlias: "as7341_main", decimals: 0, sparkline: makeSparkline(3421, 120) },
  { id: "temp_soil",label: "Temp. Suelo",       value: 22.1, unit: "°C", icon: Leaf,        color: "#10B981", variance: 0.4, sensorAlias: "ds18b20_soil",decimals: 1, sparkline: makeSparkline(22.1, 0.4) },
  { id: "soil_ec",  label: "Conductividad EC",  value: 1.84, unit: "mS/cm", icon: Zap,     color: "#10B981", variance: 0.08,sensorAlias: "soil_ec_main", decimals: 2, sparkline: makeSparkline(1.84, 0.08) },
];

const SENSORS: Sensor[] = [
  {
    alias: "bme680_main", name: "Sensor Ambiental", model: "BME680",
    type: "environmental", status: "connected", lastSeen: "hace 4s",
    readings: [
      { channel: "Temperatura", value: 24.5, unit: "°C" },
      { channel: "Humedad", value: 62.3, unit: "%" },
      { channel: "Presión", value: 1013.2, unit: "hPa" },
      { channel: "Gas VOC", value: 12450, unit: "Ω" },
    ],
  },
  {
    alias: "as7341_main", name: "Espectrómetro", model: "AS7341",
    type: "spectral", status: "connected", lastSeen: "hace 2s",
    readings: [
      { channel: "F1", value: 1234, unit: "cts", wavelength: "415 nm", barColor: "#7B2FBE" },
      { channel: "F2", value: 1456, unit: "cts", wavelength: "445 nm", barColor: "#4361EE" },
      { channel: "F3", value: 1678, unit: "cts", wavelength: "480 nm", barColor: "#4CC9F0" },
      { channel: "F4", value: 2103, unit: "cts", wavelength: "515 nm", barColor: "#4ADE80" },
      { channel: "F5", value: 1890, unit: "cts", wavelength: "555 nm", barColor: "#A3E635" },
      { channel: "F6", value: 2340, unit: "cts", wavelength: "590 nm", barColor: "#FACC15" },
      { channel: "F7", value: 1560, unit: "cts", wavelength: "630 nm", barColor: "#F97316" },
      { channel: "F8", value:  980, unit: "cts", wavelength: "680 nm", barColor: "#EF4444" },
      { channel: "Clear", value: 8921, unit: "cts", wavelength: "—" },
      { channel: "NIR",   value: 3410, unit: "cts", wavelength: "NIR" },
    ],
  },
  {
    alias: "co2_main", name: "Sensor CO₂", model: "MH-Z19B",
    type: "co2", status: "connected", lastSeen: "hace 8s",
    readings: [
      { channel: "CO₂", value: 812, unit: "ppm" },
      { channel: "Temperatura int.", value: 23.8, unit: "°C" },
    ],
  },
  {
    alias: "ds18b20_soil", name: "Temp. Suelo", model: "DS18B20",
    type: "temperature", status: "connected", lastSeen: "hace 12s",
    readings: [{ channel: "Temperatura", value: 22.1, unit: "°C" }],
  },
  {
    alias: "soil_ec_main", name: "Conductividad Suelo", model: "SEN0244",
    type: "soil_ec", status: "disconnected", lastSeen: "hace 47 min",
    readings: [
      { channel: "EC", value: 1.84, unit: "mS/cm" },
      { channel: "Temperatura", value: 21.9, unit: "°C" },
    ],
  },
];

const INITIAL_ACTUATORS: Actuator[] = [
  {
    id: "relay_main", name: "Relé Principal", type: "relay", icon: Power, state: false,
    channels: [
      { id: 1, label: "Canal 1 — Bomba riego", state: true },
      { id: 2, label: "Canal 2 — Luz UV",      state: false },
      { id: 3, label: "Canal 3 — Extractora",  state: false },
      { id: 4, label: "Canal 4 — Reserva",     state: false },
    ],
  },
  { id: "fan_main",   name: "Ventilador",       type: "fan",   icon: Fan,       state: true  },
  { id: "light_main", name: "Luz Principal",     type: "light", icon: Lightbulb, state: true  },
  { id: "pump_main",  name: "Bomba Nutrientes",  type: "pump",  icon: Droplets,  state: false },
];

const TYPE_LABELS: Record<string, string> = {
  environmental: "Ambiental",
  spectral:      "Espectral",
  temperature:   "Temperatura",
  co2:           "CO₂",
  soil_ec:       "EC Suelo",
};

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace", fontFeatureSettings: '"tnum"' };

// ─── Shared micro-components ────────────────────────────────────────────────

function StatusDot({ status }: { status: FreshStatus }) {
  const bg = status === "fresh" ? "bg-emerald-500" : status === "stale" ? "bg-amber-400" : "bg-red-500";
  return (
    <span className="relative inline-flex h-2.5 w-2.5 flex-shrink-0">
      {status === "fresh" && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${bg} opacity-60`} />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${bg}`} />
    </span>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 ${checked ? "bg-emerald-500" : "bg-white/15"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function Sparkline({ data, color }: { data: SparkPoint[]; color: string }) {
  const id = `sg${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <ResponsiveContainer width="100%" height={38}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0}    />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({ metric, status, onClick }: {
  metric: KpiMetric;
  status: FreshStatus;
  onClick: () => void;
}) {
  const Icon = metric.icon;
  const spark = metric.sparkline;
  const diff  = spark.length > 1 ? metric.value - spark[spark.length - 2].v : 0;
  const isUp  = diff > 0;
  const displayVal = metric.decimals === 0
    ? Math.round(metric.value).toLocaleString("es")
    : metric.value.toFixed(metric.decimals);

  return (
    <button
      onClick={onClick}
      className="group relative text-left w-full rounded-xl border border-white/8 bg-white/[0.04] backdrop-blur-md p-5 hover:bg-white/[0.07] hover:border-white/14 transition-all duration-200 hover:shadow-xl hover:shadow-black/30"
    >
      {/* header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg p-2" style={{ backgroundColor: metric.color + "22" }}>
            <Icon size={16} style={{ color: metric.color }} />
          </div>
          <StatusDot status={status} />
        </div>
        <span
          className="flex items-center gap-0.5 text-[11px] font-medium"
          style={{ color: diff === 0 ? "#475569" : isUp ? "#F59E0B" : "#10B981" }}
        >
          {diff !== 0 && (isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />)}
          {diff !== 0 ? `${isUp ? "+" : ""}${diff.toFixed(metric.decimals)}` : "—"}
        </span>
      </div>

      {/* value */}
      <div className="mb-0.5 flex items-baseline gap-1.5">
        <span className="text-[32px] font-semibold leading-none text-white" style={MONO}>
          {displayVal}
        </span>
        <span className="text-sm text-slate-400">{metric.unit}</span>
      </div>
      <p className="text-[11px] text-slate-500 mb-3 uppercase tracking-wider">{metric.label}</p>

      <Sparkline data={metric.sparkline} color={metric.color} />

      <ChevronRight size={13} className="absolute right-4 top-5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

// ─── Actuator Card ───────────────────────────────────────────────────────────

function ActuatorCard({ actuator, onToggle }: {
  actuator: Actuator;
  onToggle: (id: string, channelId?: number) => void;
}) {
  const Icon = actuator.icon;
  const active = actuator.type === "relay"
    ? (actuator.channels?.some(c => c.state) ?? false)
    : actuator.state;

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.04] backdrop-blur-md p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`rounded-lg p-2 transition-colors ${active ? "bg-emerald-500/20" : "bg-white/5"}`}>
            <Icon size={15} className={active ? "text-emerald-400" : "text-slate-500"} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">{actuator.name}</p>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-0.5">{actuator.type}</p>
          </div>
        </div>
        {actuator.type !== "relay" && (
          <ToggleSwitch checked={actuator.state} onChange={() => onToggle(actuator.id)} />
        )}
      </div>

      {actuator.type === "relay" && actuator.channels && (
        <div className="space-y-2.5 pt-3 border-t border-white/5">
          {actuator.channels.map(ch => (
            <div key={ch.id} className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400 truncate">{ch.label}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[10px] font-mono font-semibold w-5 ${ch.state ? "text-emerald-400" : "text-slate-600"}`}>
                  {ch.state ? "ON" : "OFF"}
                </span>
                <ToggleSwitch checked={ch.state} onChange={() => onToggle(actuator.id, ch.id)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {actuator.type !== "relay" && (
        <div className="mt-2 pt-2 border-t border-white/5">
          <span className={`text-[11px] font-mono font-semibold ${actuator.state ? "text-emerald-400" : "text-slate-600"}`}>
            {actuator.state ? "● ACTIVO" : "○ INACTIVO"}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

const NAV = [
  { id: "dashboard",  label: "Dashboard",      icon: LayoutDashboard },
  { id: "sensors",    label: "Sensores",        icon: Activity        },
  { id: "actuators",  label: "Actuadores",      icon: Sliders         },
  { id: "config",     label: "Configuración",   icon: Settings        },
  { id: "devices",    label: "Dispositivos",    icon: Server          },
] as const;

function Sidebar({ page, setPage, collapsed, setCollapsed }: {
  page: Page;
  setPage: (p: Page) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}) {
  return (
    <aside
      className="flex-shrink-0 flex flex-col transition-all duration-300 overflow-hidden"
      style={{
        width: collapsed ? 64 : 260,
        background: "#070E1A",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <Leaf size={15} className="text-emerald-400" />
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">CEA GrowBox</div>
              <div className="text-[10px] text-slate-600" style={MONO}>v2.1.4 · ESP32</div>
            </div>
            <button onClick={() => setCollapsed(true)} className="ml-auto text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0">
              <Menu size={15} />
            </button>
          </>
        )}
        {collapsed && (
          <button onClick={() => setCollapsed(false)} className="absolute left-4 top-5 text-slate-600 hover:text-slate-400 transition-colors" style={{ position: "static" }}>
            <Menu size={15} />
          </button>
        )}
      </div>

      {/* Device badge */}
      {!collapsed && (
        <div className="mx-3 mt-3 mb-1 px-3 py-2.5 rounded-lg bg-emerald-500/8 border border-emerald-500/18">
          <div className="flex items-center gap-2">
            <StatusDot status="fresh" />
            <span className="text-xs font-medium text-emerald-400 truncate">GrowBox Principal</span>
          </div>
          <p className="text-[10px] text-slate-600 mt-0.5 ml-4" style={MONO}>último dato hace 4s</p>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-hidden">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = page === id || (page === "sensor-detail" && id === "sensors");
          return (
            <button
              key={id}
              onClick={() => setPage(id as Page)}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                  : "text-slate-500 hover:bg-white/5 hover:text-slate-300 border border-transparent"
              }`}
            >
              <Icon size={17} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] text-slate-700" style={MONO}>NestJS REST · polling 5 s</p>
        </div>
      )}
    </aside>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header({ page, sensorAlias, onBack }: {
  page: Page;
  sensorAlias: string | null;
  onBack: () => void;
}) {
  const [tick, setTick] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const crumbs: { label: string; clickable: boolean }[] = [];
  if (page === "dashboard")     crumbs.push({ label: "Dashboard", clickable: false });
  else if (page === "sensors")  crumbs.push({ label: "Sensores", clickable: false });
  else if (page === "sensor-detail") {
    crumbs.push({ label: "Sensores", clickable: true });
    crumbs.push({ label: sensorAlias || "Detalle", clickable: false });
  } else if (page === "actuators") crumbs.push({ label: "Actuadores", clickable: false });
  else if (page === "config")      crumbs.push({ label: "Configuración", clickable: false });
  else if (page === "devices")     crumbs.push({ label: "Dispositivos", clickable: false });

  return (
    <header
      className="flex items-center justify-between px-6 py-3.5 flex-shrink-0"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="flex items-center gap-2 text-sm text-slate-400">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <ChevronRight size={13} className="text-slate-700" />}
            <span
              className={i === crumbs.length - 1
                ? "text-white font-medium"
                : "hover:text-slate-200 cursor-pointer transition-colors"}
              onClick={c.clickable ? onBack : undefined}
            >
              {c.label}
            </span>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-1.5 text-[11px] text-slate-500 px-3 py-1.5 rounded-lg border border-white/5 bg-white/3"
          style={MONO}
        >
          <Clock size={11} />
          {tick.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
        <button className="relative p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-colors">
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full" />
        </button>
      </div>
    </header>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

function DashboardPage({ metrics, actuators, onSensor, onToggle }: {
  metrics: KpiMetric[];
  actuators: Actuator[];
  onSensor: (alias: string) => void;
  onToggle: (id: string, channelId?: number) => void;
}) {
  return (
    <div className="space-y-8">
      {/* KPIs */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Métricas en Tiempo Real</h2>
          <div className="flex items-center gap-2 text-[11px] text-emerald-400" style={MONO}>
            <StatusDot status="fresh" />
            <span>actualizando cada 5 s</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map(m => (
            <KpiCard
              key={m.id}
              metric={m}
              status={m.id === "soil_ec" ? "offline" : "fresh"}
              onClick={() => onSensor(m.sensorAlias)}
            />
          ))}
        </div>
      </section>

      {/* Actuators */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Control de Actuadores</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {actuators.map(a => (
            <ActuatorCard key={a.id} actuator={a} onToggle={onToggle} />
          ))}
        </div>
      </section>

      {/* Mini chart preview */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Tendencias (últimas 24 h)</h2>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.04] backdrop-blur-md p-5">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={makeHistory(24.5, 1.2)}
              margin={{ top: 5, right: 20, bottom: 10, left: -10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" tick={{ fill: "#475569", fontSize: 10 }} interval={7} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#94A3B8" }}
                itemStyle={{ color: "#F59E0B" }}
                cursor={{ stroke: "rgba(255,255,255,0.1)" }}
              />
              <Line type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={2} dot={false} name="Temp. Aire (°C)" />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-slate-600 text-center mt-1" style={MONO}>Temperatura Aire — BME680</p>
        </div>
      </section>
    </div>
  );
}

// ─── Sensors List Page ────────────────────────────────────────────────────────

function SensorsPage({ sensors, onSelect }: { sensors: Sensor[]; onSelect: (alias: string) => void }) {
  const [filter, setFilter] = useState("all");
  const types = ["all", ...Array.from(new Set(sensors.map(s => s.type)))];
  const filtered = filter === "all" ? sensors : sensors.filter(s => s.type === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Sensores Registrados</h2>
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-slate-500" />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none focus:border-blue-500/50"
            style={{ background: "#0F172A" }}
          >
            {types.map(t => (
              <option key={t} value={t} style={{ background: "#0F172A" }}>
                {t === "all" ? "Todos los tipos" : TYPE_LABELS[t] || t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-white/8 bg-white/[0.04] backdrop-blur-md overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {["", "Alias", "Nombre", "Modelo", "Tipo", "Última lectura"].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((sensor, i) => (
              <tr
                key={sensor.alias}
                onClick={() => onSelect(sensor.alias)}
                className="hover:bg-white/4 cursor-pointer transition-colors"
                style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined }}
              >
                <td className="px-4 py-4">
                  <StatusDot status={sensor.status === "connected" ? "fresh" : "offline"} />
                </td>
                <td className="px-4 py-4">
                  <code className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded" style={MONO}>
                    {sensor.alias}
                  </code>
                </td>
                <td className="px-4 py-4 text-sm text-white font-medium">{sensor.name}</td>
                <td className="px-4 py-4 text-sm text-slate-400" style={MONO}>{sensor.model}</td>
                <td className="px-4 py-4">
                  <span className="text-[11px] px-2 py-1 rounded-md bg-white/6 text-slate-300 font-medium">
                    {TYPE_LABELS[sensor.type] || sensor.type}
                  </span>
                </td>
                <td className="px-4 py-4 text-xs text-slate-500" style={MONO}>{sensor.lastSeen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Sensor Detail Page ───────────────────────────────────────────────────────

function SensorDetailPage({ sensor }: { sensor: Sensor }) {
  const [tab, setTab] = useState<SensorTab>("readings");
  const [selMetric, setSelMetric] = useState(sensor.readings[0]?.channel || "");
  const [range, setRange] = useState("24h");
  const histRef = useRef<ReturnType<typeof makeHistory>>();
  if (!histRef.current) {
    histRef.current = makeHistory(
      sensor.readings.find(r => r.channel === selMetric)?.value || 50,
      15
    );
  }

  const TABS: { id: SensorTab; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
    { id: "readings", label: "Lecturas Actuales",   Icon: Activity  },
    { id: "charts",   label: "Gráficos Históricos", Icon: BarChart2 },
    { id: "config",   label: "Configuración",       Icon: Sliders   },
  ];

  const isSpectral = sensor.model === "AS7341";

  return (
    <div>
      {/* Sensor header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{sensor.name}</h1>
            <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              sensor.status === "connected"
                ? "bg-emerald-500/12 text-emerald-400 border-emerald-500/25"
                : "bg-red-500/12 text-red-400 border-red-500/25"
            }`}>
              <StatusDot status={sensor.status === "connected" ? "fresh" : "offline"} />
              {sensor.status === "connected" ? "Conectado" : "Desconectado"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap">
            <code className="text-[11px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded" style={MONO}>{sensor.alias}</code>
            <span className="text-slate-700">·</span>
            <span style={MONO}>{sensor.model}</span>
            <span className="text-slate-700">·</span>
            <span>{sensor.lastSeen}</span>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/25 text-sm font-medium hover:bg-blue-500/25 transition-colors">
          <RefreshCw size={13} />
          Solicitar Lectura
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-white/5 rounded-xl w-fit">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === id
                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Readings */}
      {tab === "readings" && (
        <div className={`grid gap-3 ${
          isSpectral
            ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
            : "grid-cols-2 md:grid-cols-4"
        }`}>
          {sensor.readings.map(r => {
            const maxVal = Math.max(...sensor.readings.map(x => x.value));
            const pct = Math.min((r.value / maxVal) * 100, 100);
            return (
              <div
                key={r.channel}
                className="rounded-xl border border-white/8 bg-white/[0.04] backdrop-blur-md p-4 hover:bg-white/[0.07] transition-colors"
              >
                {r.barColor && (
                  <div className="h-1 w-full rounded-full mb-3 bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ backgroundColor: r.barColor, width: `${pct}%`, opacity: 0.8 }}
                    />
                  </div>
                )}
                <div className="text-[26px] font-semibold text-white leading-none mb-1.5" style={MONO}>
                  {r.value > 999 ? r.value.toLocaleString("es") : r.value}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-300">{r.channel}</p>
                    {r.wavelength && (
                      <p className="text-[10px] text-slate-600 mt-0.5" style={MONO}>{r.wavelength}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-600" style={MONO}>{r.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Charts */}
      {tab === "charts" && (
        <div className="rounded-xl border border-white/8 bg-white/[0.04] backdrop-blur-md p-6">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Métrica</label>
              <select
                value={selMetric}
                onChange={e => { setSelMetric(e.target.value); histRef.current = undefined; }}
                className="text-xs border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500/50"
                style={{ background: "#0F172A" }}
              >
                {sensor.readings.map(r => (
                  <option key={r.channel} value={r.channel} style={{ background: "#0F172A" }}>{r.channel}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-1">
              {["1h", "6h", "24h", "7d"].map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    range === r ? "bg-blue-500 text-white" : "text-slate-400 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={histRef.current || makeHistory(100, 10)}
              margin={{ top: 5, right: 20, bottom: 20, left: -5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#475569", fontSize: 10, fontFamily: "JetBrains Mono" }}
                interval={Math.floor(48 / 6)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#475569", fontSize: 10, fontFamily: "JetBrains Mono" }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                contentStyle={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#94A3B8" }}
                itemStyle={{ color: "#3B82F6" }}
                cursor={{ stroke: "rgba(255,255,255,0.08)" }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={selMetric}
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#3B82F6", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Config */}
      {tab === "config" && (
        <div className="max-w-xl">
          <div className="rounded-xl border border-white/8 bg-white/[0.04] backdrop-blur-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-white">Parámetros del Sensor</h3>
              <code className="text-[10px] text-slate-600" style={MONO}>PUT /config/sensors/{sensor.alias}</code>
            </div>
            <div className="space-y-3.5">
              {[
                { label: "sample_interval",  defaultVal: "5000",  unit: "ms"                        },
                { label: "avg_samples",       defaultVal: "3",     unit: ""                          },
                { label: "alert_min",         defaultVal: String((sensor.readings[0]?.value * 0.8 || 0).toFixed(1)), unit: sensor.readings[0]?.unit || "" },
                { label: "alert_max",         defaultVal: String((sensor.readings[0]?.value * 1.2 || 100).toFixed(1)), unit: sensor.readings[0]?.unit || "" },
                { label: "enabled",           defaultVal: "true",  unit: ""                          },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-3">
                  <code className="text-[11px] text-blue-300 w-36 flex-shrink-0" style={MONO}>{f.label}</code>
                  <input
                    defaultValue={f.defaultVal}
                    className="flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                    style={MONO}
                  />
                  {f.unit && <span className="text-xs text-slate-600 w-14 text-right flex-shrink-0" style={MONO}>{f.unit}</span>}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                Guardar y enviar
              </button>
              <button className="px-4 py-2 bg-white/5 text-slate-400 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors border border-white/10">
                Restaurar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Actuators Page ───────────────────────────────────────────────────────────

function ActuatorsPage({ actuators, onToggle }: {
  actuators: Actuator[];
  onToggle: (id: string, channelId?: number) => void;
}) {
  const EVENTS = [
    { ts: "14:32:05", act: "Relé Principal",    ch: "Canal 1", prev: "OFF", next: "ON",  reason: "Manual"       },
    { ts: "13:15:22", act: "Ventilador",         ch: "—",       prev: "OFF", next: "ON",  reason: "Temp > 26 °C" },
    { ts: "12:00:00", act: "Luz Principal",      ch: "—",       prev: "ON",  next: "ON",  reason: "Schedule"     },
    { ts: "09:45:11", act: "Bomba Nutrientes",   ch: "—",       prev: "ON",  next: "OFF", reason: "Timer"        },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-5">Control de Actuadores</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {actuators.map(a => (
          <ActuatorCard key={a.id} actuator={a} onToggle={onToggle} />
        ))}
      </div>

      <h3 className="text-base font-semibold text-white mb-4">Historial de Eventos</h3>
      <div className="rounded-xl border border-white/8 bg-white/[0.04] backdrop-blur-md overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {["Timestamp", "Actuador", "Canal", "Anterior", "Nuevo", "Motivo"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EVENTS.map((ev, i) => (
              <tr key={i} className="hover:bg-white/3 transition-colors" style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
                <td className="px-4 py-3 text-xs text-slate-400" style={MONO}>{ev.ts}</td>
                <td className="px-4 py-3 text-xs text-white font-medium">{ev.act}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{ev.ch}</td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded" style={MONO}>{ev.prev}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded" style={MONO}>{ev.next}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{ev.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Config Page ─────────────────────────────────────────────────────────────

function ConfigPage({ sensors }: { sensors: Sensor[] }) {
  const [open, setOpen] = useState<string | null>(sensors[0]?.alias || null);

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-6">Configuración Global de Sensores</h2>
      <div className="space-y-2 max-w-2xl">
        {sensors.map(sensor => (
          <div key={sensor.alias} className="rounded-xl border border-white/8 bg-white/[0.04] backdrop-blur-md overflow-hidden">
            <button
              onClick={() => setOpen(open === sensor.alias ? null : sensor.alias)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <StatusDot status={sensor.status === "connected" ? "fresh" : "offline"} />
                <span className="text-sm font-medium text-white truncate">{sensor.name}</span>
                <code className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded flex-shrink-0" style={MONO}>{sensor.alias}</code>
              </div>
              <ChevronDown size={14} className={`text-slate-500 transition-transform flex-shrink-0 ml-3 ${open === sensor.alias ? "rotate-180" : ""}`} />
            </button>
            {open === sensor.alias && (
              <div className="px-5 pb-5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="space-y-3 mt-4">
                  {["sample_interval", "avg_samples", "enabled"].map(key => (
                    <div key={key} className="flex items-center gap-3">
                      <code className="text-[11px] text-blue-300 w-36 flex-shrink-0" style={MONO}>{key}</code>
                      <input
                        defaultValue={key === "enabled" ? "true" : key === "sample_interval" ? "5000" : "3"}
                        className="flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                        style={MONO}
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <button className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors">
                      Guardar
                    </button>
                    <button className="px-3 py-1.5 bg-white/5 text-slate-400 rounded-lg text-xs font-medium border border-white/10 hover:bg-white/10 transition-colors">
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Devices Page ─────────────────────────────────────────────────────────────

function DevicesPage() {
  const DEVICES = [
    { name: "GrowBox Principal", id: "esp32-001", location: "Sala cultivo A", fw: "2.1.4", ip: "192.168.1.101", sensors: 5, actuators: 4, status: "online"  as const },
    { name: "GrowBox Secundario",id: "esp32-002", location: "Sala cultivo B", fw: "2.0.9", ip: "192.168.1.102", sensors: 3, actuators: 2, status: "offline" as const },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Dispositivos ESP32</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
          <Cpu size={14} />
          Agregar dispositivo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DEVICES.map(d => (
          <div key={d.id} className="rounded-xl border border-white/8 bg-white/[0.04] backdrop-blur-md p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${d.status === "online" ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
                  <Server size={18} className={d.status === "online" ? "text-emerald-400" : "text-red-400"} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{d.name}</h3>
                  <p className="text-[10px] text-slate-500" style={MONO}>{d.id}</p>
                </div>
              </div>
              <StatusDot status={d.status === "online" ? "fresh" : "offline"} />
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-4">
              {[
                ["Ubicación", d.location],
                ["IP",        d.ip],
                ["Firmware",  `v${d.fw}`],
                ["Sensores",  d.sensors],
                ["Actuadores",d.actuators],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <span className="text-slate-600">{k}: </span>
                  <span className="text-slate-300" style={MONO}>{v}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <button className="flex-1 py-1.5 bg-white/5 text-slate-300 rounded-lg text-xs font-medium border border-white/10 hover:bg-white/10 transition-colors">
                Editar
              </button>
              <button className="px-4 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs font-medium border border-red-500/20 hover:bg-red-500/20 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage]                       = useState<Page>("dashboard");
  const [selectedAlias, setSelectedAlias]     = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [metrics, setMetrics]                 = useState<KpiMetric[]>(INITIAL_KPI);
  const [actuators, setActuators]             = useState<Actuator[]>(INITIAL_ACTUATORS);
  const sensors                               = SENSORS;

  // Simulated live polling
  useEffect(() => {
    const id = setInterval(() => {
      setMetrics(prev =>
        prev.map(m => {
          const next = Math.max(0, m.value + (Math.random() - 0.5) * m.variance);
          return {
            ...m,
            value: next,
            sparkline: [...m.sparkline.slice(1), { t: Date.now(), v: next }],
          };
        })
      );
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const handleToggle = useCallback((id: string, channelId?: number) => {
    setActuators(prev =>
      prev.map(a => {
        if (a.id !== id) return a;
        if (channelId !== undefined && a.channels) {
          return { ...a, channels: a.channels.map(ch => ch.id === channelId ? { ...ch, state: !ch.state } : ch) };
        }
        return { ...a, state: !a.state };
      })
    );
  }, []);

  const goToSensor = useCallback((alias: string) => {
    setSelectedAlias(alias);
    setPage("sensor-detail");
  }, []);

  const navTo = useCallback((p: Page) => {
    setPage(p);
    if (p !== "sensor-detail") setSelectedAlias(null);
  }, []);

  const selectedSensor = sensors.find(s => s.alias === selectedAlias);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#0B1120", fontFamily: "'Inter', sans-serif" }}
    >
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(16,185,129,0.07) 0%, transparent 65%)," +
            "radial-gradient(ellipse 60% 40% at 90% 80%, rgba(59,130,246,0.05) 0%, transparent 60%)",
        }}
      />

      <Sidebar
        page={page}
        setPage={navTo}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Header page={page} sensorAlias={selectedAlias} onBack={() => navTo("sensors")} />

        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-[1400px] mx-auto">
            {page === "dashboard" && (
              <DashboardPage
                metrics={metrics}
                actuators={actuators}
                onSensor={goToSensor}
                onToggle={handleToggle}
              />
            )}
            {page === "sensors" && (
              <SensorsPage sensors={sensors} onSelect={goToSensor} />
            )}
            {page === "sensor-detail" && selectedSensor && (
              <SensorDetailPage sensor={selectedSensor} />
            )}
            {page === "actuators" && (
              <ActuatorsPage actuators={actuators} onToggle={handleToggle} />
            )}
            {page === "config" && (
              <ConfigPage sensors={sensors} />
            )}
            {page === "devices" && <DevicesPage />}
          </div>
        </main>
      </div>
    </div>
  );
}
