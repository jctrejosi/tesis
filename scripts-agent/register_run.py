#!/usr/bin/env python
"""Registra un run causal en `control_service.model_registry` (capa 9 ligera).

Lee `metadata.yaml` y los `metrics_h*.yaml` que deja `eval_tesis.py` y hace
upsert de una fila por horizonte. Con `--active` deja solo ese run como activo
para `name='causal'`.

Uso (con el venv de control-service):
    .venv/bin/python /ruta/scripts-agent/register_run.py tesis-ct-004 --active
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import psycopg
import yaml

RUNS = Path("/home/jk/Proyectos/seeds/Astaroth/causalTransformer-api/api/storage/runs")
DSN = "postgresql://cea_user:cea_password@localhost:5438/cea_db"
SCHEMA = "control_service"


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("run_id")
    p.add_argument("--active", action="store_true")
    p.add_argument("--kind", default="world_model")
    args = p.parse_args()

    run_dir = RUNS / args.run_id
    meta = yaml.safe_load((run_dir / "metadata.yaml").read_text())
    dataset = Path(meta["dataset"])
    digest = hashlib.sha256(dataset.read_bytes()).hexdigest()[:16] if dataset.exists() else None

    files = sorted(run_dir.glob("metrics_h*.yaml"))
    if not files:
        raise SystemExit(f"sin metrics_h*.yaml en {run_dir} (usa --write-metrics)")

    inserted = []
    with psycopg.connect(DSN) as conn, conn.cursor() as cur:
        if args.active:
            cur.execute(
                f'UPDATE "{SCHEMA}".model_registry SET active = false WHERE name = %s',
                ("causal",),
            )
        for path in files:
            m = yaml.safe_load(path.read_text())
            payload = {
                "source": "offline_eval",
                "dataset": str(dataset),
                "target_mode": m["target_mode"],
                "split": m["split"],
                **m,
            }
            cur.execute(
                f'''
                INSERT INTO "{SCHEMA}".model_registry
                    (name, version, kind, dataset_hash, horizon, metrics, active)
                VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s)
                ''',
                (
                    "causal",
                    args.run_id,
                    args.kind,
                    digest,
                    m["horizon"],
                    json.dumps(payload, ensure_ascii=False),
                    args.active,
                ),
            )
            inserted.append((m["horizon"], m["global"]["mean_mase"]))
        conn.commit()

    print(f"registrado {args.run_id} kind={args.kind} active={args.active}")
    for horizon, mase in inserted:
        print(f"  h={horizon} mean_mase={mase:.3f}")


if __name__ == "__main__":
    main()
