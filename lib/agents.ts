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
  largestInvoice,
  recommendedAction,
  simulateDecision,
  type DecisionAction,
  type DecisionParameters,
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

// The action the CFO argues for. The conservative default is to delay the
// scheduled equipment purchase — the clearest way to protect payroll. But when
// there is no capex to cut (equipmentPurchase <= 0), the CFO must not argue to
// delay a purchase that doesn't exist, so it follows the deterministically
// recommended action instead. (Falls back to holding cash on the degenerate tie
// where "delay" still ranks first with nothing to delay.)
//
// Exported so the live agents (lib/fireworks.ts) and this fallback pick the
// SAME stance for the same input — live and fallback must never diverge.
export function cfoStanceAction(
  state: FinancialState,
  params: DecisionParameters = defaultDecisionParameters(state)
): DecisionAction {
  if (state.equipmentPurchase > 0) return "delay_equipment";
  const recommended = recommendedAction(state, params);
  return recommended === "delay_equipment" ? "do_nothing" : recommended;
}

export function getAgentResponses(state: FinancialState): AgentResponse[] {
  const rm = (n: number) => `RM${Math.round(n).toLocaleString()}`;

  // ---- CFO — protect payroll liquidity ---------------------------------
  const params = defaultDecisionParameters(state);
  const cfoAction = cfoStanceAction(state, params);
  const cfoCoverage = payrollCoverageScore(state, cfoAction);

  const cfo: AgentResponse =
    cfoAction === "delay_equipment"
      ? {
          agent: "CFO",
          role: "Liquidity, payroll, and runway.",
          headline:
            "I am uncomfortable risking payroll for a discretionary purchase.",
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
        }
      : (() => {
          // No capex to cut — argue the deterministically recommended action
          // instead, without ever referencing a nonexistent equipment purchase.
          const cfoTarget = largestInvoice(state);
          const stance =
            cfoAction === "prioritize_alpha"
              ? {
                  recommendation: `Accelerate ${
                    cfoTarget?.client ?? "the largest overdue account"
                  } — it is the surest cash cover for payroll.`,
                  lever: `Pulling ${cfoTarget?.client ?? "the top receivable"}'s ${rm(
                    cfoTarget?.amount ?? 0
                  )} balance forward is the strongest lever to close the gap.`,
                  risk: "The receivable may not settle before payroll is due.",
                }
              : cfoAction === "early_payment_discount"
                ? {
                    recommendation:
                      "Offer an early-payment discount to pull receivables into cash before payroll.",
                    lever:
                      "Converting overdue balances into cash now is more reliable than waiting on their original terms.",
                    risk: "Discounting receivables trims margin to buy timing certainty.",
                  }
                : {
                    recommendation:
                      "Preserve the cash on hand and take on no new commitments before payroll.",
                    lever:
                      "There is no scheduled equipment spend to cut, so protecting the existing cash balance is the priority.",
                    risk: "Without a cash lever, the payroll gap may persist.",
                  };
          return {
            agent: "CFO",
            role: "Liquidity, payroll, and runway.",
            headline: "Payroll is a fixed deadline — I want the surest cover.",
            recommendation: stance.recommendation,
            reasoning: [
              `Cash is ${rm(state.cashBalance)}; payroll is ${rm(
                state.payrollAmount
              )}. Payroll is the one bill I cannot miss.`,
              stance.lever,
              "With a fixed payday, I weight certainty over upside.",
            ],
            risk: stance.risk,
            payrollCoverageScore: cfoCoverage,
          };
        })();

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
