// Static mock boardroom for the deterministic fallback, plus the shared
// AgentResponse type used across the app.
//
// The agents are HARDCODED here (no AI). Fireworks produces the same shape at
// runtime; this data is the offline fallback so the demo never breaks. Every
// number is derived from the deterministic health check, so the fallback stays
// internally consistent with the dashboard.

import type { FinancialState, Invoice } from "./financialState";
import { checkFinancialHealth } from "./healthCheck";

export interface AgentPredictiveMetrics {
  adjustedRunwayDays: number; // days of runway under the agent's stress model
  scenarioConfidence: number; // 0..1
}

export interface AgentResponse {
  agent: "CFO" | "Collections Manager";
  role: string;
  headline: string;
  position: string;
  recommendedAction: string;
  reasoning: string[];
  statisticalVariance: string;
  predictiveMetrics: AgentPredictiveMetrics;
  quantitativeRiskScore: number; // 0..100 (higher = riskier)
  confidence: number; // 0..1
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

export function getAgentResponses(state: FinancialState): AgentResponse[] {
  const health = checkFinancialHealth(state);
  const rm = (n: number) => `RM${Math.round(n).toLocaleString()}`;
  const dailyBurn = state.monthlyOpex / 30;

  // ---- CFO — operating burn sensitivity on runway ----------------------
  const runwayHigh = round1(state.cashBalance / (dailyBurn * 0.95)); // −5% burn
  const runwayLow = round1(state.cashBalance / (dailyBurn * 1.05)); // +5% burn
  const cfoProbability = clamp01(
    health.projectedCashBeforePayroll / state.payrollAmount
  );
  const cfoRiskScore = Math.round((1 - cfoProbability) * 100);

  const cfo: AgentResponse = {
    agent: "CFO",
    role: "Strategic Financial Officer — corporate liquidity, runway constraints, and operating burn sensitivity.",
    headline: "Delay equipment. Payroll comes first.",
    position: `Payroll lands in ${state.payrollDueInDays} days and baseline cash will not cover it. Cutting a scheduled outflow is the only deterministic way to secure it.`,
    recommendedAction: "Delay Equipment Purchase.",
    reasoning: [
      `Cash is ${rm(state.cashBalance)}; payroll is ${rm(
        state.payrollAmount
      )}. The shortfall is real, not theoretical.`,
      `Releasing the earmarked ${rm(
        state.equipmentPurchase
      )} equipment payment puts that liquidity straight back into reserves.`,
      `Banking on overdue balances from high relationship-risk accounts to close the gap is irresponsible treasury management.`,
    ],
    statisticalVariance: `Operating burn sensitivity: a ±5% operating-burn swing moves the cash-zero runway between ${runwayLow} and ${runwayHigh} days.`,
    predictiveMetrics: {
      adjustedRunwayDays: runwayLow, // stressed (+5% burn) runway
      scenarioConfidence: cfoProbability,
    },
    quantitativeRiskScore: cfoRiskScore,
    confidence: 0.82,
  };

  // ---- Collections — receivables recovery assumptions ------------------
  // Target the largest outstanding receivable in whatever state was supplied,
  // so custom company profiles get coherent fallback narratives too.
  const totalReceivables = state.invoices.reduce((sum, i) => sum + i.amount, 0);
  const target = state.invoices.reduce<Invoice | undefined>(
    (top, inv) => (!top || inv.amount > top.amount ? inv : top),
    undefined
  );
  const targetName = target?.client ?? "the top receivable";
  const targetPct = Math.round((target?.collectionProbability ?? 0) * 100);
  const targetExpected = target
    ? target.amount * target.collectionProbability
    : 0;
  const collProbability = clamp01(
    totalReceivables > 0 ? health.expectedCollections / totalReceivables : 0
  );
  const collAdjRunway = round1(
    (state.cashBalance + targetExpected) / dailyBurn
  );
  const collRiskScore = Math.round((1 - collProbability) * 100);

  const collections: AgentResponse = {
    agent: "Collections Manager",
    role: "Risk Operations Manager — receivables recovery assumptions and collection aging models.",
    headline: `Chase ${targetName}. Don't freeze growth.`,
    position: `The CFO's freeze protects cash but stalls operations for a full month. We solve this by collecting, not cutting.`,
    recommendedAction: `Prioritize ${targetName}.`,
    reasoning: [
      `${targetName} carries ${targetPct}% scenario confidence on its ${rm(
        target?.amount ?? 0
      )} outstanding balance — a reliable near-term influx.`,
      `Under a standard age-of-receivables aging model, that recovery lands fast enough to cover payroll.`,
      `Freezing the ${rm(
        state.equipmentPurchase
      )} equipment spend chokes the operational momentum this business needs to grow.`,
    ],
    statisticalVariance: `Receivables recovery assumptions: ${rm(
      health.expectedCollections
    )} expected of ${rm(
      totalReceivables
    )} outstanding; ${targetName} modelled at ${targetPct}% settlement.`,
    predictiveMetrics: {
      adjustedRunwayDays: collAdjRunway,
      scenarioConfidence: collProbability,
    },
    quantitativeRiskScore: collRiskScore,
    confidence: 0.78,
  };

  return [cfo, collections];
}
