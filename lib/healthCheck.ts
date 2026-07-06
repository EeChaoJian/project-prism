// Deterministic financial health logic.
// The LLM (added in a later milestone) must NEVER invent these numbers —
// every consequence in the demo flows from this function.

import type { FinancialState } from "./financialState";

export interface FinancialHealth {
  expectedCollections: number;
  operatingBurnToPayroll: number;
  projectedCashBeforePayroll: number;
  payrollGap: number;
  runwayDays: number;
  payrollRisk: boolean;
  alertMessage: string;
}

export function checkFinancialHealth(state: FinancialState): FinancialHealth {
  // Expected collections = sum(amount * collectionProbability)
  const expectedCollections = state.invoices.reduce(
    (sum, invoice) => sum + invoice.amount * invoice.collectionProbability,
    0
  );

  // Operating cash the business burns between now and payroll.
  const dailyBurn = state.monthlyOpex / 30;
  const operatingBurnToPayroll = dailyBurn * state.payrollDueInDays;

  // Cash we can reasonably expect to have on hand before payroll is due:
  // today's cash plus expected collections, minus the operating burn that
  // happens over those days.
  const projectedCashBeforePayroll =
    state.cashBalance + expectedCollections - operatingBurnToPayroll;

  // Positive gap means we are short for payroll.
  const payrollGap = state.payrollAmount - projectedCashBeforePayroll;

  // Runway in days at the current daily burn rate.
  const runwayDays = dailyBurn > 0 ? state.cashBalance / dailyBurn : Infinity;

  const payrollRisk = payrollGap > 0;

  const alertMessage = payrollRisk
    ? `Payroll risk detected. Projected cash may fall short by RM${Math.round(
        payrollGap
      ).toLocaleString()} before payroll is due in ${state.payrollDueInDays} days.`
    : `Payroll is covered. Projected cash exceeds the RM${state.payrollAmount.toLocaleString()} payroll obligation.`;

  return {
    expectedCollections,
    operatingBurnToPayroll,
    projectedCashBeforePayroll,
    payrollGap,
    runwayDays,
    payrollRisk,
    alertMessage,
  };
}
