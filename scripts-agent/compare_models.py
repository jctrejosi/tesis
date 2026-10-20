#!/usr/bin/env python
"""Comparación offline (misma ventana y mismo split): persistencia vs XGB vs causal.

Requiere los servicios Astaroth en :8011 (XGB) y :8014 (causal) y la BD en
:5438. Sin numpy: corre con el venv de control-service.

Uso:
    .venv/bin/python /ruta/scripts-agent/compare_models.py \
        --dataset /ruta/tesis/files/tesis_world.ndjson \
        --run-id tesis-ct-004 --horizon 1
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

import httpx
import psycopg
import yaml

RUNS = Path("/home/jk/Proyectos/seeds/Astaroth/causalTransformer-api/api/storage/runs")
XGB_URL = "http://127.0.0.1:8011"
CAUSAL_URL = "http://127.0.0.1:8014"
DSN = "postgresql://cea_user:cea_password@localhost:5438/cea_db"


def history_rows(metric_names: list[str], t_last: datetime, minutes: int = 60) -> list[dict]:
    """60 filas alineadas al minuto, como `build_rows` de control-service."""
    start = t_last - timedelta(seconds=60 * (minutes - 1))
    with psycopg.connect(DSN) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT time_bucket('60 seconds', time) AS bucket,
                   metric_name, avg(value)
              FROM telemetry
             WHERE time >= %s AND time <= %s AND metric_name = ANY(%s)
             GROUP BY 1, 2
             ORDER BY 1
            """,
            (start, t_last + timedelta(seconds=60), metric_names),
        )
        found = cur.fetchall()

    timeline = [start + timedelta(seconds=60 * i) for i in range(minutes)]
    index = {ts: i for i, ts in enumerate(timeline)}
    raw: dict[str, list] = {m: [None] * minutes for m in metric_names}
    for bucket, name, value in found:
        i = index.get(bucket)
        if i is not None and name in raw:
            raw[name][i] = float(value)

    for m in metric_names:
        last = None
        for i in range(minutes):  # forward fill
            if raw[m][i] is None:
                raw[m][i] = last
            else:
                last = raw[m][i]
        first = next((v for v in raw[m] if v is not None), 0.0)
        for i in range(minutes):  # backward fill del tramo inicial
            if raw[m][i] is None:
                raw[m][i] = first
            else:
                break

    return [
        {"date": ts.isoformat(), **{m: raw[m][i] for m in metric_names}}
        for i, ts in enumerate(timeline)
    ]


def split_indices(n: int, mode: str, val_fraction: float) -> list[int]:
    if mode == "tail":
        return list(range(max(1, int(n * (1.0 - val_fraction))), n))
    if mode == "interleaved":
        step = max(2, int(round(1.0 / val_fraction)))
        return [i for i in range(n) if i % step == step - 1]
    return list(range(n))


def causal_payload(
    x_win: list[list[float]],
    u_win: list[list[int]],
    d_win: list[list[float]],
    static: list[list[float]],
    means: list[float],
    stds: list[float],
) -> dict:
    prev = [[(v - m) / s for v, m, s in zip(row, means, stds)] for row in x_win]
    return {
        "prev_outputs": [prev],
        "prev_treatments": [u_win[:-1]],
        "current_treatments": [u_win[1:]],
        "vitals": [d_win[1:]],
        "static_features": static,
        "active_entries": [[[1.0] for _ in x_win]],
    }


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--dataset", required=True)
    p.add_argument("--run-id", required=True)
    p.add_argument("--horizon", type=int, default=1)
    p.add_argument("--prefix", default="cea", help="prefijo de los modelos XGB")
    args = p.parse_args()

    run_dir = RUNS / args.run_id
    scaling = yaml.safe_load((run_dir / "scaling_params.yaml").read_text())
    meta_run = yaml.safe_load((run_dir / "metadata.yaml").read_text())
    means = list(scaling["input_means"])
    stds = list(scaling["input_stds"])
    target_mode = scaling.get("target_mode", "absolute")
    phases = list(scaling["phases"])

    with open(args.dataset) as fh:
        meta = json.loads(fh.readline())
        samples = [json.loads(line) for line in fh if line.strip()]
    metrics = list(meta["metrics"])
    k = int(meta["k"])

    mode = meta_run.get("split", "tail")
    if mode == "blocked":
        blocks = meta_run.get("blocks", 5)
        bi = meta_run.get("block_index", 0)
        size = len(samples) // blocks
        start = bi * size
        end = len(samples) if bi >= blocks - 1 else start + size
        val_idx = list(range(start, end))
    else:
        val_idx = split_indices(len(samples), mode, 0.15)
    val = [samples[i] for i in val_idx]

    h = args.horizon
    err = {name: [[0.0] * len(metrics) for _ in range(h)] for name in ("xgb", "causal")}
    pers = [[0.0] * len(metrics) for _ in range(h)]

    client = httpx.Client(timeout=120.0)
    for sample in val:
        x_hist = [[float(v) for v in row] for row in sample["x_hist"]]
        u_full = [[int(v) for v in row] for row in sample["u_hist"] + sample["u_future"]]
        d_full = [[float(v) for v in row] for row in sample["d_hist"] + sample["d_future"]]
        y_future = [[float(v) for v in row] for row in sample["y_future"]]
        t_last = datetime.fromisoformat(sample["t"].replace("Z", "+00:00"))
        static = [[1.0 if sample.get("phase") == ph else 0.0 for ph in phases]]

        rows = history_rows(metrics, t_last)
        for idx, metric in enumerate(metrics):
            r = client.post(
                f"{XGB_URL}/predict",
                json={"model_name": f"{args.prefix}:{metric}", "points": h, "data": rows},
            )
            if r.status_code != 200:
                print(f"XGB {metric}: {r.status_code} {r.text[:160]}")
                continue
            points = r.json().get("predictions", [])
            for s, point in enumerate(points[:h]):
                err["xgb"][s][idx] += abs(float(point["value"]) - y_future[s][idx])

        x_run = [list(row) for row in x_hist]
        for s in range(h):
            end_i = k + s
            start_i = end_i - k
            payload = {
                "run_id": args.run_id,
                "model_type": "ct",
                "n_steps": 1,
                "data": causal_payload(
                    x_run[-k:], u_full[start_i:end_i + 1],
                    d_full[start_i:end_i + 1], static, means, stds,
                ),
            }
            r = client.post(f"{CAUSAL_URL}/predict/", json=payload)
            r.raise_for_status()
            pred = list(r.json()["predictions"][0][-1])
            if target_mode == "delta":
                pred = [pv + bv for pv, bv in zip(pred, x_run[-1])]
            for idx in range(len(metrics)):
                err["causal"][s][idx] += abs(pred[idx] - y_future[s][idx])
                pers[s][idx] += abs(x_run[-1][idx] - y_future[s][idx])
            x_run.append(pred)

    n = len(val)
    print(f"run={args.run_id} split={mode} horizon={h} n={n}")
    print(f"{'metric':16}{'persist':>10}{'xgb':>9}{'causal':>9}"
          f"{'mase_xgb':>10}{'mase_c':>9}")
    print("-" * 63)
    mase_xgb, mase_c = [], []
    for idx, metric in enumerate(metrics):
        p = pers[-1][idx] / n
        x = err["xgb"][-1][idx] / n
        c = err["causal"][-1][idx] / n
        mx = x / p if p else float("nan")
        mc = c / p if p else float("nan")
        mase_xgb.append(mx)
        mase_c.append(mc)
        print(f"{metric:16}{p:10.3f}{x:9.3f}{c:9.3f}{mx:10.3f}{mc:9.3f}")
    print("-" * 63)
    print(f"{'MEAN MASE':16}{'':10}{'':9}{'':9}"
          f"{sum(mase_xgb) / len(mase_xgb):10.3f}{sum(mase_c) / len(mase_c):9.3f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
