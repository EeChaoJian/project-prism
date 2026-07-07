// Deterministic financial health logic.
// The LLM must NEVER invent these numbers — every consequence in the demo
// flows from this function.
//
// Inputs are sanitised (clamped to safe, finite, non-negative ranges) so that
// custom company profiles entered through the onboarding form can never produce
// NaN, Infinity, or nonsensical negative figures. Valid inputs are unchanged,
// so the deterministic sample scenario yields exactly the same numbers.

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
  const cashBalance = Number.isFinite(state.cashBalance)
    ? Math.max(0, state.cashBalance)
    : 0;
  const monthlyOpex = Number.isFinite(state.monthlyOpex)
    ? Math.max(0, state.monthlyOpex)
    : 0;
  const payrollAmount = Number.isFinite(state.payrollAmount)
    ? Math.max(0, state.payrollAmount)
    : 0;
  const payrollDueInDays =
    Number.isFinite(state.payrollDueInDays) && state.payrollDueInDays > 0
      ? state.payrollDueInDays
      : 1;

  // Expected collections = sum(amount * collectionProbability)
  const expectedCollections = state.invoices.reduce(
    (sum, invoice) =>
      sum +
      Math.max(0, Number.isFinite(invoice.amount) ? invoice.amount : 0) *
        Math.min(
          1,
          Math.max(
            0,
            Number.isFinite(invoice.collectionProbability)
              ? invoice.collectionProbability
              : 0
          )
        ),
    0
  );

  // Operating cash the business burns between now and payroll.
  const dailyBurn = monthlyOpex / 30;
  const operatingBurnToPayroll = dailyBurn * payrollDueInDays;

  // Cash we can reasonably expect to have on hand before payroll is due:
  // today's cash plus expected collections, minus the operating burn that
  // happens over those days.
  const projectedCashBeforePayroll =
    cashBalance + expectedCollections - operatingBurnToPayroll;

  // Positive gap means we are short for payroll.
  const payrollGap = payrollAmount - projectedCashBeforePayroll;

  // Runway in days at the current daily burn rate.
  const runwayDays = dailyBurn > 0 ? cashBalance / dailyBurn : 365;

  const payrollRisk = payrollGap > 0;

  const alertMessage = payrollRisk
    ? `Payroll risk detected. Projected cash may fall short by RM${Math.round(
        payrollGap
      ).toLocaleString()} before payroll is due in ${payrollDueInDays} days.`
    : `Payroll is covered. Projected cash exceeds the RM${payrollAmount.toLocaleString()} payroll obligation.`;

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
