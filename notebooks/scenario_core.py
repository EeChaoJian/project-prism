"""
Shared scenario math for Project Prism's AMD compute layer.

This mirrors the deterministic TypeScript engine (lib/healthCheck.ts,
lib/simulation.ts) exactly, so the Monte Carlo distribution is *centered on*
the deterministic point-estimate rather than replacing it. The deterministic
engine still owns every number the product shows as fact; this layer only adds
the risk distribution *around* the expected case.

Used by:
  - generate_snapshot.py  (numpy, CPU — produces the committed JSON snapshot)
  - amd_scenario_analysis.ipynb  (torch, AMD Instinct GPU — regenerates it)

Both paths compute the same quantities; the GPU just runs the 50k paths fast.
"""

from dataclasses import dataclass, field
from typing import List, Tuple


# ---------------------------------------------------------------------------
# Sample business — must match lib/financialState.ts (Harbour Coffee Roasters).
# ---------------------------------------------------------------------------
CASH = 12_000
MONTHLY_OPEX = 26_000
PAYROLL_AMOUNT = 18_000
PAYROLL_DUE_IN_DAYS = 18
EQUIPMENT_PURCHASE = 7_000

# (client, amount, collection_probability)
INVOICES: List[Tuple[str, float, float]] = [
    ("Client Alpha", 10_000, 0.80),
    ("Client Beta", 6_500, 0.55),
    ("Client Gamma", 4_200, 0.35),
]

# Decision parameters — mirror defaultDecisionParameters() in lib/simulation.ts.
DAILY_BURN = MONTHLY_OPEX / 30
OPERATING_BURN_TO_PAYROLL = DAILY_BURN * PAYROLL_DUE_IN_DAYS  # 15,600
RECOVERY_RATIO = 0.9
DISCOUNT_ACCELERATION_RATIO = 0.2995
TOTAL_OUTSTANDING = sum(a for _, a, _ in INVOICES)  # 20,700
RECOVERY_AMOUNT = round(INVOICES[0][1] * RECOVERY_RATIO)  # Client Alpha -> 9,000
CAPEX_SAVINGS = EQUIPMENT_PURCHASE  # 7,000
ACCELERATED_CASH = round(TOTAL_OUTSTANDING * DISCOUNT_ACCELERATION_RATIO)  # 6,200

# Monte Carlo assumptions (illustrative — not fitted from real data).
# Operating burn swings +/-10% over the ~18-day window (demand / cost noise).
BURN_SIGMA_FRAC = 0.10


@dataclass
class Action:
    key: str
    label: str
    fixed_cash_add: float          # deterministic cash injected by the action
    pool: List[Tuple[str, float, float]] = field(default_factory=list)  # invoices that stay a coin-flip

    def deterministic_projected_cash(self) -> float:
        expected_collections = sum(a * p for _, a, p in self.pool)
        return CASH + self.fixed_cash_add + expected_collections - OPERATING_BURN_TO_PAYROLL

    def deterministic_gap(self) -> float:
        return PAYROLL_AMOUNT - self.deterministic_projected_cash()


def build_actions() -> List[Action]:
    """The four boardroom options, mirroring simulateDecision()'s cash effects."""
    beta_gamma = INVOICES[1:]  # Alpha is settled early under prioritize_alpha
    return [
        Action("prioritize_alpha", "Prioritize Client Alpha", RECOVERY_AMOUNT, beta_gamma),
        Action("delay_equipment", "Delay Equipment Purchase", CAPEX_SAVINGS, INVOICES),
        Action("early_payment_discount", "Offer Early Payment Discount", ACCELERATED_CASH, INVOICES),
        Action("do_nothing", "Do Nothing", 0.0, INVOICES),
    ]
