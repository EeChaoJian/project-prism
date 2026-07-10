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
  const cashBalance = Number.isFinite(state.cashBalance)
    ? Math.max(0, state.cashBalance)
    : 0;
  const monthlyOpex = Number.isFinite(state.monthlyOpex)
    ? Math.max(0, state.monthlyOpex)
    : 0;
  const payrollAmount = Number.isFinite(state.payrollAmount)
    ? Math.max(0, state.payrollAmount)
    : 0;
  const equipmentPurchase = Number.isFinite(state.equipmentPurchase)
    ? Math.max(0, state.equipmentPurchase)
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
  // today's cash plus expected collections, minus operating burn and scheduled
  // capex that would leave before payroll unless the owner delays it.
  const projectedCashBeforePayroll =
    cashBalance +
    expectedCollections -
    operatingBurnToPayroll -
    equipmentPurchase;

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
