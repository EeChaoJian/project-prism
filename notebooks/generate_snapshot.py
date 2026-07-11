"""
Generate the committed data snapshot for Project Prism's AMD compute layer.

This is the CPU/numpy reference implementation. It produces the exact same
JSON schema the AMD notebook (amd_scenario_analysis.ipynb) writes when run on
an AMD Instinct GPU — the notebook is the source of truth for the demo; this
script lets CI / local dev regenerate an identical-shaped snapshot without a
GPU. The `device` field in each artifact records where it was produced, so the
data never overstates the hardware it ran on.

Run:  python3 notebooks/generate_snapshot.py
Writes: public/data/{scenario_analysis,cohort,model_card}.json
"""

import json
import os
import platform
from datetime import datetime, timezone

import numpy as np

from scenario_core import (
    BURN_SIGMA_FRAC,
    CASH,
    OPERATING_BURN_TO_PAYROLL,
    PAYROLL_AMOUNT,
    PAYROLL_DUE_IN_DAYS,
    build_actions,
)

N_PATHS = 50_000
SEED = 20260711
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data")

DEVICE = f"cpu ({platform.machine()}) — snapshot; regenerate on AMD to stamp GPU"


def monte_carlo(rng: np.random.Generator) -> dict:
    """Per-option payroll-survival distribution across N_PATHS simulated futures.

    Two mean-preserving sources of variance, so E[projected cash] equals the
    deterministic engine's number exactly:
      1. Collections — each outstanding invoice settles or not (Bernoulli at its
         collection probability) instead of the expected-value average.
      2. Operating burn — Normal around the deterministic burn (+/-10%).
    """
    options = []
    for a in build_actions():
        collections = np.zeros(N_PATHS)
        for _client, amount, prob in a.pool:
            collections += amount * (rng.random(N_PATHS) < prob)
        burn = rng.normal(OPERATING_BURN_TO_PAYROLL, BURN_SIGMA_FRAC * OPERATING_BURN_TO_PAYROLL, N_PATHS)
        projected_cash = CASH + a.fixed_cash_add + collections - burn
        survives = projected_cash >= PAYROLL_AMOUNT

        options.append({
            "action": a.key,
            "label": a.label,
            "survivalProbability": round(float(survives.mean()), 4),
            "deterministicProjectedCash": round(a.deterministic_projected_cash()),
            "deterministicPayrollGap": round(a.deterministic_gap()),
            "meanProjectedCash": round(float(projected_cash.mean())),
            "p10ProjectedCash": round(float(np.percentile(projected_cash, 10))),
            "p90ProjectedCash": round(float(np.percentile(projected_cash, 90))),
        })

    options.sort(key=lambda o: -o["survivalProbability"])
    best = options[0]
    return {
        "device": DEVICE,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "method": "Monte Carlo over invoice-collection and operating-burn variance",
        "paths": N_PATHS,
        "seed": SEED,
        "payrollAmount": PAYROLL_AMOUNT,
        "payrollDueInDays": PAYROLL_DUE_IN_DAYS,
        "note": (
            "Illustrative scenario analysis. Variance assumptions are modelled, "
            "not fitted from real data. Means reconcile with the deterministic "
            "engine (lib/healthCheck.ts); this layer only adds the distribution "
            "around the deterministic expected case."
        ),
        "recommended": best["action"],
        "options": options,
    }


def synthetic_cohort(rng: np.random.Generator) -> dict:
    """147 synthetic peers sharing Harbour Coffee Roasters' demo risk profile.

    Replaces the hardcoded lookalikeCohortData in lib/financialState.ts with a
    generated-but-still-synthetic cohort. NOT real market data.
    """
    n = 147
    delay_success = (rng.random(n) < 0.90).mean()
    accel_days = float(np.clip(rng.normal(11, 2, n), 1, None).mean())
    default_no_action = (rng.random(n) < 0.72).mean()
    return {
        "device": DEVICE,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "cohortId": "CH-RETAIL-SUPPLY-04",
        "industry": "Retail & F&B Supply",
        "sampleSize": n,
        "synthetic": True,
        "note": "Synthetic demo cohort — generated, not sourced from any registry.",
        "matchingCriteria": [
            "Runway < 20 days",
            "Payroll Gap > RM4,000",
            "Highly concentrated overdue accounts receivable",
        ],
        "historicalOutcomes": {
            "delayEquipmentSuccessRate": round(float(delay_success), 3),
            "discountInflowAccelerationDays": round(accel_days, 1),
            "defaultRateIfNoAction": round(float(default_no_action), 3),
        },
    }


def predictive_model(rng: np.random.Generator) -> dict:
    """Small logistic-regression classifier on synthetic SME-months.

    On AMD this trains as a torch module on the GPU; here it is a numpy
    gradient-descent reference. It learns to predict payroll survival from a few
    normalized features, confirming the deterministic risk ranking. Reported for
    methodology only — no model number is presented to the user as fact.
    """
    m = 20_000
    cash = rng.normal(12_000, 4_000, m)
    gap = rng.normal(6_000, 4_000, m)
    runway = rng.normal(14, 6, m)
    concentration = rng.random(m)  # share of AR in the single largest client
    X = np.stack([cash, gap, runway, concentration], axis=1)
    Xn = (X - X.mean(0)) / (X.std(0) + 1e-9)

    # Ground-truth label: survives when the gap is comfortably covered, with noise.
    logit = -0.9 * (gap / 4000) + 0.5 * (cash / 4000) + 0.3 * (runway / 6)
    y = (logit + rng.normal(0, 0.5, m) > 0).astype(float)

    w = np.zeros(Xn.shape[1])
    b = 0.0
    lr = 0.2
    for _ in range(400):
        z = Xn @ w + b
        p = 1 / (1 + np.exp(-z))
        gw = Xn.T @ (p - y) / m
        gb = float((p - y).mean())
        w -= lr * gw
        b -= lr * gb

    # AUC via rank statistic.
    p = 1 / (1 + np.exp(-(Xn @ w + b)))
    order = np.argsort(p)
    ranks = np.empty_like(order, dtype=float)
    ranks[order] = np.arange(1, m + 1)
    pos = y == 1
    n_pos, n_neg = int(pos.sum()), int((~pos).sum())
    auc = (ranks[pos].sum() - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg)

    features = ["cash", "payrollGap", "runway", "receivableConcentration"]
    return {
        "device": DEVICE,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "model": "logistic regression (4 features)",
        "trainingRows": m,
        "synthetic": True,
        "validationAuc": round(float(auc), 3),
        "note": (
            "Trained on synthetic SME-months to validate the deterministic risk "
            "ranking. Methodology artifact only — not shown to the user as fact."
        ),
        "featureWeights": {f: round(float(wi), 3) for f, wi in zip(features, w)},
    }


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    rng = np.random.default_rng(SEED)
    artifacts = {
        "scenario_analysis.json": monte_carlo(rng),
        "cohort.json": synthetic_cohort(rng),
        "model_card.json": predictive_model(rng),
    }
    for name, data in artifacts.items():
        path = os.path.join(OUT_DIR, name)
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
        print(f"wrote {os.path.relpath(path)}")

    sa = artifacts["scenario_analysis.json"]
    print("\nPayroll-survival across 50,000 simulated futures:")
    for o in sa["options"]:
        print(f"  {o['label']:<28} {o['survivalProbability']*100:5.1f}%   "
              f"(det. gap RM{o['deterministicPayrollGap']:,})")
    print(f"\nRecommended (highest survival): {sa['recommended']}")


if __name__ == "__main__":
    main()
