// Deterministic decision simulation.
// Given the current state and a chosen action, produce a new state plus
// before/after health snapshots so the dashboard can show the impact.

import type { FinancialState } from "./financialState";
import { checkFinancialHealth, type FinancialHealth } from "./healthCheck";

export type DecisionAction =
  | "prioritize_alpha"
  | "delay_equipment"
  | "early_payment_discount"
  | "do_nothing";

export interface DecisionOption {
  action: DecisionAction;
  label: string;
  description: string;
}

// The buttons shown to the owner, in demo order.
export const decisionOptions: DecisionOption[] = [
  {
    action: "prioritize_alpha",
    label: "Prioritize Client Alpha",
    description: "Chase the RM10,000 high-value overdue invoice first.",
  },
  {
    action: "delay_equipment",
    label: "Delay Equipment Purchase",
    description:
      "Postpone the RM7,000 equipment spend to protect cash. The company had already earmarked RM7,000 for a scheduled equipment payment next week.",
  },
  {
    action: "early_payment_discount",
    label: "Offer Early Payment Discount",
    description: "Incentivise clients to pay now in exchange for a discount.",
  },
  {
    action: "do_nothing",
    label: "Do Nothing",
    description: "Take no action and leave the payroll risk in place.",
  },
];

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
  action: DecisionAction
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
      label = "Prioritize Client Alpha";
      // Client Alpha pays earlier: RM9,000 lands in cash and the invoice clears.
      updatedState.cashBalance += 9000;
      updatedState.invoices = updatedState.invoices.filter(
        (invoice) => invoice.client !== "Client Alpha"
      );
      explanation =
        "Client Alpha was prioritised and is expected to pay earlier, bringing RM9,000 into cash and clearing the largest overdue receivable.";
      break;
    }
    case "delay_equipment": {
      label = "Delay Equipment Purchase";
      // Preserve RM7,000 of liquidity that would have gone to equipment.
      updatedState.cashBalance += 7000;
      updatedState.equipmentPurchase = 0;
      explanation =
        "The equipment purchase was delayed, releasing the earmarked RM7,000 capital expense back into active liquid reserves to maintain payroll coverage.";
      break;
    }
    case "early_payment_discount": {
      label = "Offer Early Payment Discount";
      // Early payment incentive accelerates ~RM6,200 of cash inflow.
      updatedState.cashBalance += 6200;
      explanation =
        "An early payment incentive accelerated RM6,200 of receivables into cash, at the cost of some margin.";
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
