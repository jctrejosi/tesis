#!/usr/bin/env python
"""Estadísticas del dataset de la tesis: drift train/val y persistencia por métrica."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

path = Path(sys.argv[1])
with path.open() as fh:
    meta = json.loads(fh.readline())
    samples = [json.loads(line) for line in fh if line.strip()]

metrics = list(meta["metrics"])
x = np.asarray([s["x_hist"] + s["y_future"] for s in samples], dtype=np.float64)
n = len(x)
split = max(1, int(n * 0.85))

flat_tr = x[:split, :-1, :].reshape(-1, len(metrics))
flat_va = x[split:, :-1, :].reshape(-1, len(metrics))

print(f"n={n} split={split} k={meta['k']} h={meta['h']} freq={meta.get('freq_seconds')}")
print(f"{'metric':16}{'tr_mean':>12}{'tr_std':>11}{'va_mean':>12}{'va_std':>11}"
      f"{'pers_mae':>10}{'val_range':>11}")
pers = np.abs(x[split:, 1:, :] - x[split:, :-1, :]).reshape(-1, len(metrics))
for j, m in enumerate(metrics):
    rng = x[split:, :, j].max() - x[split:, :, j].min()
    print(f"{m:16}{flat_tr[:, j].mean():12.3f}{flat_tr[:, j].std():11.3f}"
          f"{flat_va[:, j].mean():12.3f}{flat_va[:, j].std():11.3f}"
          f"{pers[:, j].mean():10.3f}{rng:11.3f}")

d = np.asarray([s["d_hist"] + s["d_future"] for s in samples], dtype=np.float64)
u = np.asarray([s["u_hist"] + s["u_future"] for s in samples], dtype=np.float64)
print(f"\nd_t dim={d.shape[-1]} means={np.round(d[:, :-1, :].mean(0), 3).tolist()}")
print(f"u_t cambios por canal={np.abs(np.diff(u[:split], axis=1)).sum(axis=(0, 1)).tolist()}")
print(f"channels={meta.get('channels')}")
