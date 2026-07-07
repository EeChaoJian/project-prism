// Deterministic decision simulation.
// Given the current state, a chosen action, and (optionally) user-customized
// decision assumptions, produce a new state plus before/after health snapshots
// so the dashboard can show the impact.
//
// When no parameters are supplied, defaultDecisionParameters() derives them
// from the financial state using ratios calibrated to the MASTER_SPEC sample —
// so the classic Harbour Coffee Roasters scenario still yields exactly RM9,000 /
// RM7,000 / RM6,200, with zero regression.

import type { FinancialState, Invoice } from "./financialState";
import { checkFinancialHealth, type FinancialHealth } from "./healthCheck";

export type DecisionAction =
  | "prioritize_alpha" // prioritise the targeted receivable (id kept stable)
  | "delay_equipment"
  | "early_payment_discount"
  | "do_nothing";

export interface DecisionOption {
  action: DecisionAction;
  label: string;
  description: string;
}

// User-tunable financial variables behind each boardroom choice.
export interface DecisionParameters {
  recoveryTargetClient: string; // which invoice to chase
  recoveryAmount: number; // cash realised if the target settles early
  recoveryProbability: number; // 0..1 — modelled settlement confidence
  capexSavings: number; // cash preserved by deferring the equipment spend
  acceleratedCash: number; // cash pulled forward by the settlement incentive
  discountPercent: number; // margin discount offered (narrative only)
}

const rm = (n: number) => `RM${Math.round(n).toLocaleString()}`;

// Calibrated to the MASTER_SPEC sample:
// 0.9 × Client Alpha's RM10,000 = RM9,000; 0.2995 × RM20,700 total ≈ RM6,200.
const RECOVERY_RATIO = 0.9;
const DISCOUNT_ACCELERATION_RATIO = 0.2995;

export function largestInvoice(state: FinancialState): Invoice | undefined {
  return state.invoices.reduce<Invoice | undefined>(
    (top, inv) => (!top || inv.amount > top.amount ? inv : top),
    undefined
  );
}

export function defaultDecisionParameters(
  state: FinancialState
): DecisionParameters {
  const target = largestInvoice(state);
  const totalOutstanding = state.invoices.reduce((sum, i) => sum + i.amount, 0);
  return {
    recoveryTargetClient: target?.client ?? "",
    recoveryAmount: Math.round((target?.amount ?? 0) * RECOVERY_RATIO),
    recoveryProbability: target?.collectionProbability ?? 0,
    capexSavings: state.equipmentPurchase,
    acceleratedCash: Math.round(totalOutstanding * DISCOUNT_ACCELERATION_RATIO),
    discountPercent: 2,
  };
}

// The buttons shown to the owner, built from the live state + parameters so
// labels and figures always match what the simulation will actually do.
export function getDecisionOptions(
  state: FinancialState,
  params: DecisionParameters
): DecisionOption[] {
  const target =
    state.invoices.find((i) => i.client === params.recoveryTargetClient) ??
    largestInvoice(state);
  const targetName = target?.client ?? "Top Receivable";

  return [
    {
      action: "prioritize_alpha",
      label: `Prioritize ${targetName}`,
      description: `Chase the ${rm(target?.amount ?? 0)} outstanding balance from ${targetName}, modelled at ${Math.round(
        params.recoveryProbability * 100
      )}% settlement confidence.`,
    },
    {
      action: "delay_equipment",
      label: "Delay Equipment Purchase",
      description: `Postpone the ${rm(params.capexSavings)} equipment spend to protect cash. The company had already earmarked ${rm(
        params.capexSavings
      )} for a scheduled equipment payment next week.`,
    },
    {
      action: "early_payment_discount",
      label: "Offer Early Payment Discount",
      description: `Offer a ${params.discountPercent}% early-settlement incentive to accelerate ${rm(
        params.acceleratedCash
      )} of receivables into cash.`,
    },
    {
      action: "do_nothing",
      label: "Do Nothing",
      description: "Take no action and leave the payroll risk in place.",
    },
  ];
}

export interface SimulationResult {
  action: DecisionAction;
  label: string;
  explanation: string;
  updatedState: FinancialState;
  before: FinancialHealth;
  after: FinancialHealth;
}

export function simulateDecision(
  state: FinancialState,
  action: DecisionAction,
  params: DecisionParameters = defaultDecisionParameters(state)
): SimulationResult {
  const before = checkFinancialHealth(state);

  // Work on a copy so callers never mutate the source state.
  const updatedState: FinancialState = {
    ...state,
    invoices: state.invoices.map((invoice) => ({ ...invoice })),
  };

  let explanation = "";
  let label = "";

  switch (action) {
    case "prioritize_alpha": {
      const target =
        updatedState.invoices.find(
          (i) => i.client === params.recoveryTargetClient
        ) ?? largestInvoice(updatedState);

      if (!target) {
        label = "Prioritize Receivable";
        explanation =
          "No outstanding receivables are available to prioritise. Cash is unchanged.";
        break;
      }

      label = `Prioritize ${target.client}`;
      // The targeted client settles early: recovery cash lands, invoice clears.
      updatedState.cashBalance += params.recoveryAmount;
      updatedState.invoices = updatedState.invoices.filter(
        (invoice) => invoice.client !== target.client
      );
      explanation = `${target.client} was prioritised and is expected to pay earlier, bringing ${rm(
        params.recoveryAmount
      )} into cash and clearing the ${rm(target.amount)} overdue balance.`;
      break;
    }
    case "delay_equipment": {
      label = "Delay Equipment Purchase";
      // Preserve the earmarked capex liquidity.
      updatedState.cashBalance += params.capexSavings;
      updatedState.equipmentPurchase = Math.max(
        0,
        updatedState.equipmentPurchase - params.capexSavings
      );
      explanation = `The equipment purchase was delayed, releasing the earmarked ${rm(
        params.capexSavings
      )} capital expense back into active liquid reserves to maintain payroll coverage.`;
      break;
    }
    case "early_payment_discount": {
      label = "Offer Early Payment Discount";
      // The settlement incentive accelerates receivables into cash.
      updatedState.cashBalance += params.acceleratedCash;
      explanation = `A ${params.discountPercent}% early-settlement incentive accelerated ${rm(
        params.acceleratedCash
      )} of receivables into cash, at the cost of some margin.`;
      break;
    }
    case "do_nothing":
    default: {
      label = "Do Nothing";
      explanation =
        "No action was taken. Cash is unchanged and the payroll risk remains.";
      break;
    }
  }

  const after = checkFinancialHealth(updatedState);

  return { action, label, explanation, updatedState, before, after };
}

// ---- Option comparison (read-only; reuses simulateDecision) --------------
// A compact per-action outcome for the "Compare all options" table. Pure
// derivation — it changes no state and adds no new simulation logic.

export interface OptionOutcome {
  action: DecisionAction;
  label: string;
  cashAfter: number;
  runwayAfter: number;
  payrollGapAfter: number;
  protectsPayroll: boolean;
}

const ALL_ACTIONS: DecisionAction[] = [
  "prioritize_alpha",
  "delay_equipment",
  "early_payment_discount",
  "do_nothing",
];

// Run every action through the deterministic engine and summarise the outcome.
export function compareOptions(
  state: FinancialState,
  params: DecisionParameters = defaultDecisionParameters(state)
): OptionOutcome[] {
  return ALL_ACTIONS.map((action) => {
    const r = simulateDecision(state, action, params);
    return {
      action,
      label: r.label,
      cashAfter: r.updatedState.cashBalance,
      runwayAfter: r.after.runwayDays,
      payrollGapAfter: r.after.payrollGap,
      protectsPayroll: !r.after.payrollRisk,
    };
  });
}

// Deterministic "best" pick: if payroll is already safe, do nothing; otherwise
// the option that leaves the smallest payroll gap (tie-break: longest runway).
export function recommendedAction(
  state: FinancialState,
  params: DecisionParameters = defaultDecisionParameters(state)
): DecisionAction {
  if (!checkFinancialHealth(state).payrollRisk) return "do_nothing";
  return [...compareOptions(state, params)].sort(
    (a, b) =>
      a.payrollGapAfter - b.payrollGapAfter || b.runwayAfter - a.runwayAfter
  )[0].action;
}
