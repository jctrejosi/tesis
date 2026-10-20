#!/usr/bin/env python
"""Entrena copias del baseline XGB sobre un rango temporal concreto.

Sirve para comparar contra el world model con el **mismo corte** train/val,
sin reutilizar modelos de fases anteriores entrenados con otro rango.

Uso:
    .venv/bin/python /ruta/scripts-agent/train_xgb_range.py \
        --since 2026-09-30T18:00:00Z --until 2026-09-30T21:55:00Z \
        --prefix cea2
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timedelta, timezone

import httpx
import psycopg

XGB_URL = "http://127.0.0.1:8011"
DSN = "postgresql://cea_user:cea_password@localhost:5438/cea_db"
METRICS = [
    "temperature", "humidity", "pressure", "co2", "ec",
    "vpd", "dew_point", "ndvi", "par", "ec_compensated",
]


def parse_ts(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--since", required=True)
    p.add_argument("--until", required=True)
    p.add_argument("--prefix", default="cea2")
    args = p.parse_args()

    since, until = parse_ts(args.since), parse_ts(args.until)
    with psycopg.connect(DSN) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT time_bucket('60 seconds', time) AS bucket,
                   metric_name, avg(value)
              FROM telemetry
             WHERE time >= %s AND time < %s AND metric_name = ANY(%s)
             GROUP BY 1, 2
             ORDER BY 1
            """,
            (since, until, METRICS),
        )
        found = cur.fetchall()

    minutes = int((until - since).total_seconds() // 60)
    timeline = [since + timedelta(seconds=60 * i) for i in range(minutes)]
    index = {ts: i for i, ts in enumerate(timeline)}
    series = {m: [None] * minutes for m in METRICS}
    for bucket, name, value in found:
        i = index.get(bucket)
        if i is not None and name in series:
            series[name][i] = float(value)

    for m in METRICS:
        last = None
        for i in range(minutes):
            if series[m][i] is None:
                series[m][i] = last
            else:
                last = series[m][i]
        first = next((v for v in series[m] if v is not None), 0.0)
        for i in range(minutes):
            if series[m][i] is None:
                series[m][i] = first
            else:
                break

    rows = [
        {"date": ts.isoformat(), **{m: series[m][i] for m in METRICS}}
        for i, ts in enumerate(timeline)
    ]
    print(f"filas={len(rows)} rango={since.isoformat()}..{until.isoformat()}")

    client = httpx.Client(timeout=300.0)
    for metric in METRICS:
        r = client.post(
            f"{XGB_URL}/train",
            json={
                "model_name": f"{args.prefix}:{metric}",
                "target_column": metric,
                "data": rows,
            },
        )
        ok = r.status_code == 200
        detail = r.json() if ok else r.text[:200]
        records = detail.get("records", "?") if isinstance(detail, dict) else "?"
        print(f"  {metric:16} {'ok' if ok else 'ERROR'} records={records}")
        if not ok:
            print(f"    {json.dumps(detail, ensure_ascii=False)[:200]}")


if __name__ == "__main__":
    main()
