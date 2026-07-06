// Static mock boardroom for the deterministic fallback, plus the shared
// AgentResponse type used across the app.
//
// The agents are HARDCODED here (no AI). Fireworks produces the same shape at
// runtime; this data is the offline fallback so the demo never breaks. Every
// number is derived from the deterministic health check, so the fallback stays
// internally consistent with the dashboard.

import type { FinancialState } from "./financialState";
import { checkFinancialHealth } from "./healthCheck";

export interface AgentPredictiveMetrics {
  adjustedRunwayDays: number; // days of runway under the agent's stress model
  probabilityOfSuccess: number; // 0..1
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
    role: "Strategic Financial Officer — corporate liquidity, runway, and payroll stability analysis.",
    headline: "Preserve liquidity before the cash-zero point",
    position: `The business is exposed to payroll risk in ${state.payrollDueInDays} days, with a payroll gap of ${rm(
      health.payrollGap
    )}.`,
    recommendedAction: "Delay the equipment purchase to extend runway.",
    reasoning: [
      `Cash balance is ${rm(state.cashBalance)} against a ${rm(
        state.payrollAmount
      )} payroll obligation.`,
      `Daily operating burn is ${rm(dailyBurn)}, a baseline runway of ${round1(
        health.runwayDays
      )} days.`,
      `Preserving ${rm(
        state.equipmentPurchase
      )} of liquidity directly defers the cash-zero point.`,
    ],
    statisticalVariance: `Operating burn sensitivity: a ±5% operating-burn swing moves the cash-zero runway between ${runwayLow} and ${runwayHigh} days.`,
    predictiveMetrics: {
      adjustedRunwayDays: runwayLow, // stressed (+5% burn) runway
      probabilityOfSuccess: cfoProbability,
    },
    quantitativeRiskScore: cfoRiskScore,
    confidence: 0.82,
  };

  // ---- Collections — risk-adjusted receivables recovery vector ---------
  const totalReceivables = state.invoices.reduce((sum, i) => sum + i.amount, 0);
  const alpha = state.invoices.find((i) => i.client === "Client Alpha");
  const alphaExpected = alpha ? alpha.amount * alpha.collectionProbability : 0;
  const collProbability = clamp01(
    totalReceivables > 0 ? health.expectedCollections / totalReceivables : 0
  );
  const collAdjRunway = round1((state.cashBalance + alphaExpected) / dailyBurn);
  const collRiskScore = Math.round((1 - collProbability) * 100);

  const collections: AgentResponse = {
    agent: "Collections Manager",
    role: "Expert risk operations analyst — receivables recovery and cash inflow.",
    headline: "Recover the highest-probability receivable",
    position: `Acknowledging the CFO's liquidity constraint, the risk-adjusted receivables recovery vector totals ${rm(
      health.expectedCollections
    )} across ${state.invoices.length} invoices.`,
    recommendedAction: "Prioritise collecting from Client Alpha.",
    reasoning: [
      `Client Alpha owes ${rm(
        alpha?.amount ?? 0
      )} at an 80% settlement probability — the strongest vector.`,
      `Under a standard age-of-receivables collection model, Alpha contributes ${rm(
        alphaExpected
      )} of expected recovery.`,
      `Recovering Alpha lifts adjusted runway to ${collAdjRunway} days, easing the cash-zero pressure.`,
    ],
    statisticalVariance: `Risk-adjusted receivables recovery vector: ${rm(
      health.expectedCollections
    )} expected of ${rm(
      totalReceivables
    )} outstanding; Client Alpha settlement modelled at 80% ± 10%.`,
    predictiveMetrics: {
      adjustedRunwayDays: collAdjRunway,
      probabilityOfSuccess: collProbability,
    },
    quantitativeRiskScore: collRiskScore,
    confidence: 0.78,
  };

  return [cfo, collections];
}
