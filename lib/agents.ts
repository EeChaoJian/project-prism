// Placeholder agent responses for the deterministic MVP.
//
// In this milestone the agents are HARDCODED — no AI is called. These same
// shapes will later be produced by Fireworks AI, with this data serving as the
// offline fallback so the demo never breaks.

import type { FinancialState } from "./financialState";
import { checkFinancialHealth } from "./healthCheck";

export interface AgentResponse {
  agent: "CFO" | "Collections Manager";
  role: string;
  headline: string;
  position: string;
  recommendedAction: string;
  reasoning: string[];
  risk: string;
  confidence: number; // 0..1
}

// Built from the live financial state so the numbers always match the
// dashboard. Agents are only allowed to reference deterministic figures.
export function getAgentResponses(state: FinancialState): AgentResponse[] {
  const health = checkFinancialHealth(state);
  const rm = (n: number) => `RM${Math.round(n).toLocaleString()}`;

  const cfo: AgentResponse = {
    agent: "CFO",
    role: "Focuses on liquidity, runway, and payroll stability.",
    headline: "Preserve liquidity before payroll",
    position: `The business is exposed to payroll risk in ${state.payrollDueInDays} days.`,
    recommendedAction: "Delay the equipment purchase.",
    reasoning: [
      `Cash balance is currently ${rm(state.cashBalance)}.`,
      `Payroll obligation is ${rm(state.payrollAmount)}.`,
      `Preserving ${rm(state.equipmentPurchase)} improves short-term liquidity.`,
    ],
    risk: "Delaying equipment may slow operational improvements.",
    confidence: 0.82,
  };

  const collections: AgentResponse = {
    agent: "Collections Manager",
    role: "Focuses on recovering receivables and improving cash inflow.",
    headline: "Recover the highest-value receivable",
    position: `Expected collections total ${rm(health.expectedCollections)} across ${state.invoices.length} invoices.`,
    recommendedAction: "Prioritise collecting from Client Alpha.",
    reasoning: [
      "Client Alpha owes RM10,000 and is 45 days overdue.",
      "Collection probability is 80%, the highest of the outstanding invoices.",
      "Accelerating this payment directly closes the payroll gap.",
    ],
    risk: "Client Alpha is a high-relationship-risk account; aggressive chasing could strain the relationship.",
    confidence: 0.78,
  };

  return [cfo, collections];
}
