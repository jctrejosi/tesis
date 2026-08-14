import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Leaf, Sparkles, Plus, Trash2, CheckCircle2, AlertTriangle,
  Loader2, Save, ChevronDown, Pencil, Radio, FlaskConical,
} from "lucide-react";

// ─── Configuración ─────────────────────────────────────────────────────────

const API_BASE =
  (import.meta.env?.VITE_PLANT_SERVICE_URL as string | undefined) ??
  "http://localhost:8000";

const MONO: CSSProperties = { fontFamily: "'JetBrains Mono', monospace", fontFeatureSettings: "'tnum'" };

// ─── Tipos (contrato con plant-service) ────────────────────────────────────

interface RangeTarget {
  min?: number | null;
  target?: number | null;
  max?: number | null;
  unit?: string | null;
  controllable?: boolean;
  informational_only?: boolean;
  reason?: string | null;
}

interface LightingTarget {
  hours_on?: number | null;
  hours_off?: number | null;
  intensity_target?: number | null;
  unit?: string | null;
  controllable?: boolean;
  informational_only?: boolean;
  reason?: string | null;
}

interface IrrigationTarget {
  min_interval_hours?: number | null;
  duration_seconds?: number | null;
  threshold?: number | null;
  unit?: string | null;
  controllable?: boolean;
  informational_only?: boolean;
  reason?: string | null;
}

interface CustomTarget {
  value?: number | null;
  min?: number | null;
  target?: number | null;
  max?: number | null;
  unit?: string | null;
  informational_only?: boolean;
  reason?: string | null;
}

interface PhaseTargets {
  temperature?: RangeTarget | null;
  humidity?: RangeTarget | null;
  soil_moisture?: RangeTarget | null;
  lighting?: LightingTarget | null;
  ventilation?: RangeTarget | null;
  extraction?: RangeTarget | null;
  irrigation?: IrrigationTarget | null;
  co2?: RangeTarget | null;
  substrate_temperature?: RangeTarget | null;
  ec?: RangeTarget | null;
  ph?: RangeTarget | null;
  water_level?: RangeTarget | null;
  custom?: Record<string, CustomTarget>;
}

interface Phase {
  id: string;
  name: string;
  description: string | null;
  order: number;
  is_active: boolean;
  targets: PhaseTargets | null;
  recommended_targets: PhaseTargets | null;
  is_modified: boolean;
  updated_at: string;
}

interface Crop {
  id: string;
  name: string;
  species: string;
  variety: string | null;
  location: string | null;
  growing_system: string | null;
  notes: string | null;
  active_phase_id: string | null;
}

interface CropDetail extends Crop {
  phases: Phase[];
}

interface RecommendResult {
  recommendation_id: string;
  model: string;
  summary: string | null;
  notes: string[];
  phases: { phase_id: string; name: string; created: boolean; targets_preserved: boolean }[];
}

// ─── Utilidades ────────────────────────────────────────────────────────────

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* sin cuerpo JSON */
    }
    throw new Error(detail);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const fmt = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : String(value);

function Badge({ tone, children }: { tone: "emerald" | "amber" | "blue" | "red" | "slate"; children: ReactNode }) {
  const tones: Record<string, string> = {
    emerald: "text-emerald-400 bg-emerald-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    blue: "text-blue-400 bg-blue-500/10",
    red: "text-red-400 bg-red-500/10",
    slate: "text-slate-400 bg-white/5",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tones[tone]}`}>
      {children}
    </span>
  );
}

const inputCls =
  "w-full text-xs bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500/50 transition-colors";

// ─── Editor de parámetros de una fase ──────────────────────────────────────

const RANGE_PARAMS: { key: keyof PhaseTargets; label: string; placeholder: string }[] = [
  { key: "temperature", label: "Temperatura", placeholder: "°C" },
  { key: "humidity", label: "Humedad relativa", placeholder: "%HR" },
  { key: "soil_moisture", label: "Humedad del sustrato", placeholder: "%" },
  { key: "ventilation", label: "Ventilación", placeholder: "%" },
  { key: "extraction", label: "Extracción", placeholder: "%" },
  { key: "co2", label: "CO₂", placeholder: "ppm" },
  { key: "substrate_temperature", label: "Temp. sustrato", placeholder: "°C" },
  { key: "ec", label: "Conductividad (EC)", placeholder: "mS/cm" },
  { key: "ph", label: "pH", placeholder: "" },
  { key: "water_level", label: "Nivel de agua", placeholder: "%" },
];

interface EditorProps {
  phase: Phase;
  onSave: (phaseId: string, targets: PhaseTargets) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

function PhaseEditor({ phase, onSave, onCancel, saving }: EditorProps) {
  const [draft, setDraft] = useState<PhaseTargets>(() =>
    JSON.parse(JSON.stringify(phase.targets ?? {})),
  );

  const setRange = (key: keyof PhaseTargets, field: "min" | "target" | "max" | "unit", value: string) => {
    setDraft(prev => {
      const current = (prev[key] as RangeTarget | null | undefined) ?? {};
      const next = { ...current, [field]: value === "" ? null : Number(value) };
      if (field === "unit") next.unit = value;
      return { ...prev, [key]: next };
    });
  };

  const setLighting = (field: "hours_on" | "hours_off" | "intensity_target", value: string) => {
    setDraft(prev => ({
      ...prev,
      lighting: { ...(prev.lighting ?? {}), [field]: value === "" ? null : Number(value) },
    }));
  };

  const setIrrigation = (field: "min_interval_hours" | "duration_seconds" | "threshold", value: string) => {
    setDraft(prev => ({
      ...prev,
      irrigation: { ...(prev.irrigation ?? {}), [field]: value === "" ? null : Number(value) },
    }));
  };

  const setCustom = (name: string, field: "value" | "min" | "target" | "max", value: string) => {
    setDraft(prev => ({
      ...prev,
      custom: {
        ...(prev.custom ?? {}),
        [name]: { ...(prev.custom?.[name] ?? {}), [field]: value === "" ? null : Number(value) },
      },
    }));
  };

  const addCustom = () => {
    const name = window.prompt("Nombre del parámetro adicional (ej. vpd):");
    if (!name) return;
    setDraft(prev => ({
      ...prev,
      custom: { ...(prev.custom ?? {}), [name]: { value: null, informational_only: true } },
    }));
  };

  const removeCustom = (name: string) => {
    setDraft(prev => {
      const custom = { ...(prev.custom ?? {}) };
      delete custom[name];
      return { ...prev, custom };
    });
  };

  const rec = phase.recommended_targets ?? {};

  const numberInput = (value: string, onChange: (v: string) => void, placeholder?: string) => (
    <input
      type="number"
      step="any"
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className={inputCls}
      style={MONO}
    />
  );

  return (
    <div className="px-5 pb-5 pt-4 space-y-5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      {RANGE_PARAMS.map(({ key, label, placeholder }) => {
        const current = (draft[key] as RangeTarget | null | undefined) ?? {};
        const recommended = (rec[key] as RangeTarget | null | undefined) ?? null;
        return (
          <div key={String(key)} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">{label}</span>
              {recommended && (
                <span className="text-[10px] text-blue-300" style={MONO}>
                  IA: {fmt(recommended.min)} / {fmt(recommended.target)} / {fmt(recommended.max)}{" "}
                  {recommended.unit ?? placeholder}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {numberInput(current.min === undefined ? "" : String(current.min ?? ""), v => setRange(key, "min", v), "mín")}
              {numberInput(current.target === undefined ? "" : String(current.target ?? ""), v => setRange(key, "target", v), "objetivo")}
              {numberInput(current.max === undefined ? "" : String(current.max ?? ""), v => setRange(key, "max", v), "máx")}
            </div>
            {recommended?.reason && (
              <p className="text-[10px] text-slate-600 leading-relaxed">{recommended.reason}</p>
            )}
          </div>
        );
      })}

      {/* Iluminación */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300">Iluminación (fotoperiodo)</span>
          <span className="text-[10px] text-blue-300" style={MONO}>
            IA: {fmt((rec.lighting as LightingTarget | undefined)?.hours_on)}h luz /{" "}
            {fmt((rec.lighting as LightingTarget | undefined)?.hours_off)}h oscuridad
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {numberInput(draft.lighting?.hours_on === undefined ? "" : String(draft.lighting?.hours_on ?? ""), v => setLighting("hours_on", v), "horas de luz")}
          {numberInput(draft.lighting?.hours_off === undefined ? "" : String(draft.lighting?.hours_off ?? ""), v => setLighting("hours_off", v), "horas de oscuridad")}
          {numberInput(draft.lighting?.intensity_target === undefined ? "" : String(draft.lighting?.intensity_target ?? ""), v => setLighting("intensity_target", v), "intensidad")}
        </div>
      </div>

      {/* Riego */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300">Riego</span>
          <span className="text-[10px] text-blue-300" style={MONO}>
            IA: umbral {fmt((rec.irrigation as IrrigationTarget | undefined)?.threshold)} ·{" "}
            {fmt((rec.irrigation as IrrigationTarget | undefined)?.duration_seconds)}s
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {numberInput(draft.irrigation?.threshold === undefined ? "" : String(draft.irrigation?.threshold ?? ""), v => setIrrigation("threshold", v), "umbral (%)")}
          {numberInput(draft.irrigation?.duration_seconds === undefined ? "" : String(draft.irrigation?.duration_seconds ?? ""), v => setIrrigation("duration_seconds", v), "duración (s)")}
          {numberInput(draft.irrigation?.min_interval_hours === undefined ? "" : String(draft.irrigation?.min_interval_hours ?? ""), v => setIrrigation("min_interval_hours", v), "intervalo (h)")}
        </div>
      </div>

      {/* Parámetros adicionales */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300">Parámetros adicionales</span>
          <button
            onClick={addCustom}
            className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Plus size={11} /> Agregar
          </button>
        </div>
        {Object.keys(draft.custom ?? {}).length === 0 && (
          <p className="text-[10px] text-slate-600">
            Sin parámetros extra. Pueden agregarse sin modificar el backend (ej. vpd, salinidad…).
          </p>
        )}
        {Object.entries((draft.custom ?? {}) as Record<string, CustomTarget>).map(([name, value]) => (
          <div key={name} className="rounded-lg border border-white/8 bg-white/[0.03] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <code className="text-[11px] text-blue-300" style={MONO}>{name}</code>
              <button onClick={() => removeCustom(name)} className="text-slate-600 hover:text-red-400 transition-colors">
                <Trash2 size={12} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {numberInput(value?.value === undefined ? "" : String(value?.value ?? ""), v => setCustom(name, "value", v), "valor")}
              {numberInput(value?.min === undefined ? "" : String(value?.min ?? ""), v => setCustom(name, "min", v), "mín")}
              {numberInput(value?.target === undefined ? "" : String(value?.target ?? ""), v => setCustom(name, "target", v), "objetivo")}
              {numberInput(value?.max === undefined ? "" : String(value?.max ?? ""), v => setCustom(name, "max", v), "máx")}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          disabled={saving}
          onClick={() => onSave(phase.id, draft)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Guardar configuración
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 bg-white/5 text-slate-400 rounded-lg text-xs font-medium border border-white/10 hover:bg-white/10 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────

export default function CropsPage() {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selected, setSelected] = useState<CropDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", species: "", variety: "", location: "", growing_system: "" });

  const loadCrops = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await api<Crop[]>("/api/v1/crops");
      setCrops(list);
    } catch (err) {
      setError(`No se pudo conectar con plant-service (${API_BASE}): ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCrops();
  }, [loadCrops]);

  const loadDetail = useCallback(async (id: string) => {
    try {
      setError(null);
      const detail = await api<CropDetail>(`/api/v1/crops/${id}`);
      setSelected(detail);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const selectCrop = useCallback(
    (id: string) => {
      setExpanded(null);
      setNotice(null);
      void loadDetail(id);
    },
    [loadDetail],
  );

  const createCrop = async () => {
    if (!form.name.trim() || !form.species.trim()) {
      setError("El nombre y la especie son obligatorios.");
      return;
    }
    setBusy("create");
    setError(null);
    try {
      const created = await api<Crop>("/api/v1/crops", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          species: form.species,
          variety: form.variety || null,
          location: form.location || null,
          growing_system: form.growing_system || null,
        }),
      });
      setForm({ name: "", species: "", variety: "", location: "", growing_system: "" });
      setShowCreate(false);
      await loadCrops();
      await loadDetail(created.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const recommend = async () => {
    if (!selected) return;
    setBusy("recommend");
    setError(null);
    setNotice(null);
    try {
      const result = await api<RecommendResult>(`/api/v1/crops/${selected.id}/recommend`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const preserved = result.phases.some(p => p.targets_preserved);
      setNotice(
        `${result.summary ?? "Recomendación generada"} · modelo ${result.model} · ${result.phases.length} fases` +
          (preserved ? " · se preservaron tus modificaciones manuales" : ""),
      );
      await loadDetail(selected.id);
    } catch (err) {
      setError(`Recomendación fallida: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const savePhase = async (phaseId: string, targets: PhaseTargets) => {
    if (!selected) return;
    setBusy(`save-${phaseId}`);
    setError(null);
    try {
      await api(`/api/v1/crops/${selected.id}/phases/${phaseId}`, {
        method: "PATCH",
        body: JSON.stringify({ targets }),
      });
      setExpanded(null);
      await loadDetail(selected.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const activatePhase = async (phaseId: string) => {
    if (!selected) return;
    setBusy(`activate-${phaseId}`);
    setError(null);
    try {
      await api(`/api/v1/crops/${selected.id}/phases/${phaseId}/activate`, { method: "POST" });
      await loadDetail(selected.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const deletePhase = async (phaseId: string) => {
    if (!selected || !window.confirm("¿Eliminar esta fase y sus parámetros?")) return;
    setBusy(`delete-${phaseId}`);
    setError(null);
    try {
      await api(`/api/v1/crops/${selected.id}/phases/${phaseId}`, { method: "DELETE" });
      await loadDetail(selected.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const activePhase = useMemo(
    () => selected?.phases.find(p => p.is_active) ?? null,
    [selected],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Cultivos y Parámetros Ambientales</h2>
          <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
            Configura los objetivos por fase del cultivo. La IA (DeepSeek) propone valores de
            referencia que puedes ajustar manualmente; el ESP consulta la configuración de la
            fase activa vía <code className="text-blue-400/80" style={MONO}>/api/v1/device/config</code>.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors flex-shrink-0"
        >
          <Plus size={13} /> Nuevo cultivo
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">
          <AlertTriangle size={14} className="flex-shrink-0" /> {error}
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
          <CheckCircle2 size={14} className="flex-shrink-0" /> {notice}
        </div>
      )}

      {showCreate && (
        <div className="rounded-xl border border-white/8 bg-white/[0.04] backdrop-blur-md p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Crear cultivo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-600 mb-1.5">Nombre *</label>
              <input className={inputCls} value={form.name} placeholder="Tomates invernadero 1"
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-600 mb-1.5">Especie *</label>
              <input className={inputCls} value={form.species} placeholder="tomate"
                onChange={e => setForm(f => ({ ...f, species: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-600 mb-1.5">Variedad</label>
              <input className={inputCls} value={form.variety} placeholder="cherry (opcional)"
                onChange={e => setForm(f => ({ ...f, variety: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-600 mb-1.5">Sistema de cultivo</label>
              <input className={inputCls} value={form.growing_system} placeholder="suelo, hidroponía, NFT…"
                onChange={e => setForm(f => ({ ...f, growing_system: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-wider text-slate-600 mb-1.5">Ubicación / condiciones</label>
              <input className={inputCls} value={form.location} placeholder="Invernadero 1 (opcional)"
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              disabled={busy === "create"}
              onClick={createCrop}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {busy === "create" ? <Loader2 size={12} className="animate-spin" /> : <Leaf size={12} />}
              Crear cultivo
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 bg-white/5 text-slate-400 rounded-lg text-xs font-medium border border-white/10 hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 items-start">
        {/* Lista de cultivos */}
        <div className="space-y-2">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 px-2">
              <Loader2 size={12} className="animate-spin" /> Cargando…
            </div>
          )}
          {!loading && crops.length === 0 && (
            <div className="rounded-xl border border-white/8 bg-white/[0.04] px-4 py-8 text-center">
              <Leaf size={22} className="mx-auto text-slate-700 mb-2" />
              <p className="text-xs text-slate-500">Aún no hay cultivos.</p>
              <p className="text-[10px] text-slate-700 mt-1">Crea uno para empezar.</p>
            </div>
          )}
          {crops.map(crop => (
            <button
              key={crop.id}
              onClick={() => selectCrop(crop.id)}
              className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                selected?.id === crop.id
                  ? "border-emerald-500/40 bg-emerald-500/[0.07]"
                  : "border-white/8 bg-white/[0.04] hover:bg-white/[0.07]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-white truncate">{crop.name}</span>
                {crop.active_phase_id && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {crop.species}
                {crop.variety ? ` · ${crop.variety}` : ""}
              </p>
            </button>
          ))}
        </div>

        {/* Detalle */}
        {selected && (
          <div className="space-y-4 min-w-0">
            <div className="rounded-xl border border-white/8 bg-white/[0.04] backdrop-blur-md p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-white">{selected.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selected.species}
                    {selected.variety ? ` · variedad ${selected.variety}` : ""}
                    {selected.growing_system ? ` · ${selected.growing_system}` : ""}
                    {selected.location ? ` · ${selected.location}` : ""}
                  </p>
                </div>
                <button
                  disabled={busy === "recommend"}
                  onClick={recommend}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500 text-white rounded-lg text-xs font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors"
                >
                  {busy === "recommend" ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  Solicitar recomendación (DeepSeek)
                </button>
              </div>
              {activePhase && (
                <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-400">
                  <Radio size={12} className="text-emerald-400" />
                  Fase activa para el ESP: <span className="text-emerald-300 font-medium">{activePhase.name}</span>
                </div>
              )}
            </div>

            {/* Fases */}
            {selected.phases.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
                <FlaskConical size={20} className="mx-auto text-slate-700 mb-2" />
                <p className="text-xs text-slate-500">
                  Sin fases. Solicita la recomendación de DeepSeek o crea fases manualmente.
                </p>
              </div>
            )}

            {selected.phases
              .slice()
              .sort((a, b) => a.order - b.order)
              .map(phase => (
                <div key={phase.id} className="rounded-xl border border-white/8 bg-white/[0.04] backdrop-blur-md overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2 px-5 py-3.5">
                    <button
                      onClick={() => setExpanded(expanded === phase.id ? null : phase.id)}
                      className="flex items-center gap-2 text-sm font-medium text-white hover:text-emerald-300 transition-colors"
                    >
                      <ChevronDown size={14} className={`text-slate-500 transition-transform ${expanded === phase.id ? "rotate-180" : ""}`} />
                      {phase.name}
                    </button>
                    {phase.is_active && <Badge tone="emerald">Activa</Badge>}
                    {phase.is_modified && <Badge tone="amber">Modificada manualmente</Badge>}
                    {!phase.is_modified && phase.recommended_targets && <Badge tone="blue">Según IA</Badge>}
                    {!phase.is_modified && !phase.recommended_targets && <Badge tone="slate">Manual</Badge>}

                    <div className="flex items-center gap-2 ml-auto">
                      {!phase.is_active && (
                        <button
                          disabled={busy === `activate-${phase.id}`}
                          onClick={() => activatePhase(phase.id)}
                          className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors"
                        >
                          <Radio size={11} /> Activar
                        </button>
                      )}
                      <button
                        onClick={() => setExpanded(expanded === phase.id ? null : phase.id)}
                        className="flex items-center gap-1 text-[10px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Pencil size={11} /> Editar
                      </button>
                      <button
                        disabled={busy === `delete-${phase.id}`}
                        onClick={() => deletePhase(phase.id)}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {expanded === phase.id && (
                    <PhaseEditor
                      phase={phase}
                      saving={busy === `save-${phase.id}`}
                      onSave={savePhase}
                      onCancel={() => setExpanded(null)}
                    />
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
