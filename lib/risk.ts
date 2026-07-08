// Deterministic risk language shared across the briefing, boardroom, and result.
// Derived purely from the frozen health check — no new simulation logic.

import type { FinancialState } from "./financialState";
import type { FinancialHealth } from "./healthCheck";

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export const RISK_INDEX: Record<RiskLevel, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
};

// Risk escalates with the payroll shortfall relative to the payroll obligation.
export function riskLevel(
  state: FinancialState,
  health: FinancialHealth
): RiskLevel {
  if (!health.payrollRisk) return "Low";
  const ratio =
    state.payrollAmount > 0 ? health.payrollGap / state.payrollAmount : 1;
  if (ratio >= 0.5) return "Critical";
  if (ratio >= 0.25) return "High";
  return "Medium";
}
