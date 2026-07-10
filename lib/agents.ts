// Static mock boardroom for the deterministic fallback, plus the shared
// AgentResponse type used across the app.
//
// The agents are HARDCODED here (no AI). Fireworks produces the same shape at
// runtime; this data is the offline fallback so the demo never breaks. Every
// number is derived from the deterministic health check, so the fallback stays
// internally consistent with the dashboard.

import type { FinancialState, Invoice } from "./financialState";
import {
  defaultDecisionParameters,
  simulateDecision,
  type DecisionAction,
} from "./simulation";

export interface AgentResponse {
  agent: "CFO" | "Collections Manager";
  role: string;
  headline: string;
  recommendation: string;
  reasoning: string[];
  risk: string;
  payrollCoverageScore: number; // 0..1
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
export const payrollCoverageScore = (
  state: FinancialState,
  action: DecisionAction
) => {
  const result = simulateDecision(state, action, defaultDecisionParameters(state));
  if (state.payrollAmount <= 0) return 1;
  return clamp01(result.after.projectedCashBeforePayroll / state.payrollAmount);
};

export function getAgentResponses(state: FinancialState): AgentResponse[] {
  const rm = (n: number) => `RM${Math.round(n).toLocaleString()}`;

  // ---- CFO — protect payroll liquidity ---------------------------------
  const cfoCoverage = payrollCoverageScore(state, "delay_equipment");

  const cfo: AgentResponse = {
    agent: "CFO",
    role: "Liquidity, payroll, and runway.",
    headline: "I am uncomfortable risking payroll for a discretionary purchase.",
    recommendation: "Delay the equipment purchase and protect payroll first.",
    reasoning: [
      `Cash is ${rm(state.cashBalance)}; payroll is ${rm(
        state.payrollAmount
      )}. The shortfall is real, not theoretical.`,
      `Delaying the earmarked ${rm(
        state.equipmentPurchase
      )} equipment payment keeps that cash from leaving before payroll.`,
      "Waiting for overdue invoices adds timing risk when payroll has a fixed deadline.",
    ],
    risk: "Operations may slow if the equipment purchase is delayed.",
    payrollCoverageScore: cfoCoverage,
  };

  // ---- Collections — receivables recovery assumptions ------------------
  // Target the largest outstanding receivable in whatever state was supplied,
  // so custom company profiles get coherent fallback narratives too.
  const target = state.invoices.reduce<Invoice | undefined>(
    (top, inv) => (!top || inv.amount > top.amount ? inv : top),
    undefined
  );
  const targetName = target?.client ?? "the top receivable";
  const targetPct = Math.round((target?.collectionProbability ?? 0) * 100);
  const collectionsConfidence = target
    ? payrollCoverageScore(state, "prioritize_alpha")
    : 0;

  const collections: AgentResponse = target
    ? {
        agent: "Collections Manager",
        role: "Receivables and overdue invoices.",
        headline: "I think we are being too conservative.",
        recommendation: `I disagree. Prioritize ${targetName} before freezing operations.`,
        reasoning: [
          `${targetName} carries ${targetPct}% settlement confidence on its ${rm(
            target.amount
          )} outstanding balance.`,
          "Receivables recovery may preserve payroll without delaying the equipment plan.",
          `Freezing the ${rm(
            state.equipmentPurchase
          )} equipment spend may cost momentum after the crisis passes.`,
        ],
        risk: "The invoice may not arrive before payroll is due.",
        payrollCoverageScore: collectionsConfidence,
      }
    : {
        agent: "Collections Manager",
        role: "Receivables and overdue invoices.",
        headline: "No receivables to recover.",
        recommendation:
          "I cannot recommend a collections play without outstanding invoices.",
        reasoning: [
          "There are no overdue invoices available to chase.",
          "Receivables recovery cannot close the payroll gap in this scenario.",
          "The owner should focus on cash preservation or another immediate response.",
        ],
        risk: "The business has no receivables lever to pull before payroll.",
        payrollCoverageScore: 0,
      };

  return [cfo, collections];
}
