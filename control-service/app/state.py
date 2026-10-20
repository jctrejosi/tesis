"""State estimator (capa 3): construye `x_t`, `u_t`, `d_t` desde TimescaleDB.

Mismo contrato que `scripts/build_dataset.js` y `docs/datos.md`:
- `x_t`: núcleo de 10 métricas, re-muestreadas por `time_bucket` + forward-fill.
- `u_t`: 4 canales del relé (1 = ON, 0 = OFF), forward-fill.
- `d_t`: hora (sin/cos) + día de la semana (sin/cos) — §1.3.

Capa 3 (docs/especificacion.md §5) añade sobre el re-muestreo:
- **imputación acotada**: huecos de hasta `max_gap_steps` se rellenan (`active=1`);
  huecos más largos quedan `active=0` (no se imputan) — máscara `active_entries`.
- **outliers por rango físico** (`unit_bounds`): un valor fuera de cota se trata como
  hueco, no contamina la ventana.
- **máscara `observed`**: distingue valor observado de valor imputado.
- **objetivo `x*`**: setpoints/fase vigentes (de `plant_service.setpoint_snapshots`).
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.config import Settings


@dataclass
class MetricSeries:
    """Serie re-muestreada de una métrica con sus máscaras.

    `values` es la señal lista para el modelo; `active` marca los pasos usables
    (observados o imputados dentro del límite) y `observed` los realmente medidos.
    """

    values: list[float]
    active: list[int]
    observed: list[int]


@dataclass
class Window:
    """Ventana de estado lista para un modelo (numpy-free)."""

    timestamps: list[datetime]
    x: list[list[float]]      # [k][dim_x]
    u: list[list[int]]        # [k][dim_u]
    d: list[list[float]]      # [k][dim_d]
    metrics: list[str]
    channels: list[int]
    active: list[list[int]] = field(default_factory=list)    # [k][dim_x] 1=usable
    observed: list[list[int]] = field(default_factory=list)  # [k][dim_x] 1=medido
    x_target: dict | None = None   # x* (setpoints vigentes)
    phase: str | None = None       # fase activa (-> static_features)

    @property
    def latest(self) -> list[float]:
        return list(self.x[-1]) if self.x else []

    @property
    def latest_time(self) -> datetime | None:
        return self.timestamps[-1] if self.timestamps else None


def floor_ts(ts: datetime, freq: int) -> datetime:
    epoch = int(ts.timestamp())
    return datetime.fromtimestamp(epoch - (epoch % freq), tz=timezone.utc)


def context_vector(ts: datetime) -> list[float]:
    """`d_t`: hora + día de la semana (sin/cos). Debe coincidir con el dataset."""
    hour = (ts.hour + ts.minute / 60) / 24
    dow = ((ts.weekday() + 1) % 7) / 7  # 0=domingo, como getUTCDay() de JS
    return [
        round(math.sin(hour * 2 * math.pi), 6),
        round(math.cos(hour * 2 * math.pi), 6),
        round(math.sin(dow * 2 * math.pi), 6),
        round(math.cos(dow * 2 * math.pi), 6),
    ]


def _forward_fill(seq: list, initial=None) -> list:
    last = next((v for v in seq if v is not None), initial)
    for i, value in enumerate(seq):
        if value is None:
            seq[i] = last
        else:
            last = value
    return seq


def resample_metric(
    raw: list[float | None],
    bounds: tuple[float, float] | None = None,
    max_gap: int = 3,
    default: float = 0.0,
) -> MetricSeries:
    """Re-muestrea una métrica con imputación acotada y máscaras.

    - Valor ausente **o fuera de cota física** ⇒ cuenta como hueco.
    - Hueco de longitud `<= max_gap` ⇒ forward-fill e `active=1` (imputado).
    - Hueco más largo ⇒ forward-fill del último válido pero `active=0`.
    - Sin ningún valor previo ⇒ `default`, `active=0`.
    """
    values: list[float] = []
    active: list[int] = []
    observed: list[int] = []
    last: float | None = None
    gap = 0
    for value in raw:
        if value is None or (bounds is not None and not (bounds[0] <= value <= bounds[1])):
            gap += 1
            observed.append(0)
            if last is None:
                values.append(default)
                active.append(0)
            else:
                values.append(last)
                active.append(1 if gap <= max_gap else 0)
        else:
            gap = 0
            last = float(value)
            values.append(last)
            active.append(1)
            observed.append(1)
    return MetricSeries(values=values, active=active, observed=observed)


def _window_times(end: datetime, freq: int, count: int) -> list[datetime]:
    """Rejilla de `count` buckets que **termina** en floor(end)."""
    last = floor_ts(end, freq)
    return [last - timedelta(seconds=freq * (count - 1 - i)) for i in range(count)]


def _forward_times(after: datetime, freq: int, count: int) -> list[datetime]:
    """Rejilla de `count` buckets **siguientes** a floor(after)."""
    last = floor_ts(after, freq)
    return [last + timedelta(seconds=freq * (i + 1)) for i in range(count)]


async def _telemetry_buckets(
    engine: AsyncEngine, settings: Settings, t0: datetime, t1: datetime
) -> list[dict]:
    sql = text(
        """
        SELECT time_bucket((:freq)::interval, time) AS bucket,
               metric_name, avg(value) AS value
          FROM telemetry
         WHERE time >= :t0 AND time <= :t1
           AND metric_name = ANY(:metrics)
         GROUP BY 1, 2
         ORDER BY 1
        """
    )
    async with engine.connect() as conn:
        result = await conn.execute(
            sql,
            {
                "freq": f"{settings.freq_seconds} seconds",
                "t0": t0,
                "t1": t1,
                "metrics": settings.metric_list,
            },
        )
        return [dict(row) for row in result.mappings()]


async def _action_buckets(
    engine: AsyncEngine, settings: Settings, t0: datetime, t1: datetime
) -> list[dict]:
    sql = text(
        """
        SELECT time_bucket((:freq)::interval, time) AS bucket,
               channel, last(state, time) AS state
          FROM control_actions
         WHERE time >= :t0 AND time <= :t1
           AND channel = ANY(:channels)
         GROUP BY 1, 2
         ORDER BY 1
        """
    )
    async with engine.connect() as conn:
        result = await conn.execute(
            sql,
            {
                "freq": f"{settings.freq_seconds} seconds",
                "t0": t0,
                "t1": t1,
                "channels": settings.channel_list,
            },
        )
        return [dict(row) for row in result.mappings()]


async def build_window(
    engine: AsyncEngine, settings: Settings, end: datetime | None = None
) -> Window:
    """Ventana de `window` pasos terminando en la última rejilla <= `end`."""
    freq = settings.freq_seconds
    k = settings.window
    metrics = settings.metric_list
    channels = settings.channel_list
    end = end or datetime.now(timezone.utc)
    bounds = settings.bounds

    timeline = _window_times(end, freq, k)
    t0 = timeline[0]
    t1 = timeline[-1] + timedelta(seconds=freq)
    index = {ts: i for i, ts in enumerate(timeline)}

    raw_x: dict[str, list] = {m: [None] * k for m in metrics}
    for row in await _telemetry_buckets(engine, settings, t0, t1):
        i = index.get(row["bucket"])
        if i is not None and row["metric_name"] in raw_x:
            raw_x[row["metric_name"]][i] = float(row["value"])

    x_res = {
        m: resample_metric(raw_x[m], bounds.get(m), settings.max_gap_steps)
        for m in metrics
    }

    u_series: dict[int, list[int]] = {c: [0] * k for c in channels}
    for row in await _action_buckets(engine, settings, t0, t1):
        i = index.get(row["bucket"])
        if i is not None and row["channel"] in u_series:
            u_series[row["channel"]][i] = 1 if row["state"] == "ON" else 0

    x_target, phase = await fetch_target(engine, settings, timeline[-1])

    return Window(
        timestamps=timeline,
        x=[[x_res[m].values[i] for m in metrics] for i in range(k)],
        u=[[u_series[c][i] for c in channels] for i in range(k)],
        d=[context_vector(ts) for ts in timeline],
        metrics=metrics,
        channels=channels,
        active=[[x_res[m].active[i] for m in metrics] for i in range(k)],
        observed=[[x_res[m].observed[i] for m in metrics] for i in range(k)],
        x_target=x_target,
        phase=phase,
    )


async def fetch_target(
    engine: AsyncEngine, settings: Settings, at: datetime
) -> tuple[dict | None, str | None]:
    """Setpoints (`x*`) de la última instantánea vigente en `at`.

    Degrada a `(None, None)` si `plant_service.setpoint_snapshots` no existe
    (p. ej. tests aislados) — el estado sigue siendo válido sin objetivo.
    """
    sql = text(
        """
        SELECT phase_name, targets
          FROM plant_service.setpoint_snapshots
         WHERE valid_from <= :at
         ORDER BY valid_from DESC
         LIMIT 1
        """
    )
    try:
        async with engine.connect() as conn:
            row = (await conn.execute(sql, {"at": at})).mappings().first()
    except SQLAlchemyError:
        return None, None
    if not row:
        return None, None
    targets = row["targets"]
    return (dict(targets) if targets else None), row["phase_name"]


async def fetch_actuals(
    engine: AsyncEngine, settings: Settings, after: datetime, horizon: int
) -> list[list[float | None]]:
    """Valores reales por bucket en los `horizon` pasos SIGUIENTES a `after`."""
    freq = settings.freq_seconds
    metrics = settings.metric_list
    timeline = _forward_times(after, freq, horizon)
    index = {ts: i for i, ts in enumerate(timeline)}
    series: dict[str, list] = {m: [None] * horizon for m in metrics}
    for row in await _telemetry_buckets(
        engine, settings, timeline[0], timeline[-1] + timedelta(seconds=freq)
    ):
        i = index.get(row["bucket"])
        if i is not None and row["metric_name"] in series:
            series[row["metric_name"]][i] = float(row["value"])
    return [[series[m][i] for m in metrics] for i in range(horizon)]


async def latest_data_time(
    engine: AsyncEngine, settings: Settings
) -> datetime | None:
    """Último bucket con telemetría (robusto frente a desajustes de reloj)."""
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT max(time) AS t FROM telemetry"))
        row = result.mappings().first()
    value = row["t"] if row else None
    return floor_ts(value, settings.freq_seconds) if value is not None else None


async def build_rows(
    engine: AsyncEngine, settings: Settings, start: datetime, end: datetime
) -> list[dict]:
    """Serie alineada como filas `{date, <metric>, u<n>}` para la API de Astaroth.

    La API de XGBoost construye sus propios lags y features de fecha a partir de
    `date`, así que aquí solo se entregan las columnas del contrato.
    """
    freq = settings.freq_seconds
    metrics = settings.metric_list
    channels = settings.channel_list

    timeline: list[datetime] = []
    t = floor_ts(start, freq)
    last = floor_ts(end, freq)
    while t <= last:
        timeline.append(t)
        t += timedelta(seconds=freq)
    if not timeline:
        return []

    index = {ts: i for i, ts in enumerate(timeline)}
    n = len(timeline)
    x_series: dict[str, list] = {m: [None] * n for m in metrics}
    for row in await _telemetry_buckets(
        engine, settings, timeline[0], timeline[-1] + timedelta(seconds=freq)
    ):
        i = index.get(row["bucket"])
        if i is not None and row["metric_name"] in x_series:
            x_series[row["metric_name"]][i] = float(row["value"])
    for m in metrics:
        _forward_fill(x_series[m], 0.0)

    u_series: dict[int, list[int]] = {c: [0] * n for c in channels}
    for row in await _action_buckets(
        engine, settings, timeline[0], timeline[-1] + timedelta(seconds=freq)
    ):
        i = index.get(row["bucket"])
        if i is not None and row["channel"] in u_series:
            u_series[row["channel"]][i] = 1 if row["state"] == "ON" else 0

    rows: list[dict] = []
    for i, ts in enumerate(timeline):
        row: dict = {"date": ts.isoformat()}
        for m in metrics:
            row[m] = x_series[m][i]
        for c in channels:
            row[f"u{c}"] = u_series[c][i]
        rows.append(row)
    return rows
