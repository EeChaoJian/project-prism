"use client";

import type { AgentResponse } from "@/lib/agents";
import type { FinancialState } from "@/lib/financialState";
import type { DecisionAction, SimulationResult } from "@/lib/simulation";
import type { ReactNode } from "react";

const rm = (n: number) => `RM${Math.round(n).toLocaleString()}`;
const signedRm = (n: number) =>
  `${n >= 0 ? "+" : "-"}RM${Math.abs(Math.round(n)).toLocaleString()}`;
const days = (n: number) => `${Math.round(n).toLocaleString()} days`;

interface ExecutiveActionPlanProps {
  company: FinancialState;
  result: SimulationResult;
  board: AgentResponse[];
}

const OBJECTIVE_BY_ACTION: Record<DecisionAction, string> = {
  prioritize_alpha:
    "Protect payroll by pulling receivables into cash before the deadline.",
  delay_equipment:
    "Protect payroll while preserving as much runway as possible.",
  early_payment_discount:
    "Improve near-term cash coverage while limiting margin trade-offs.",
  do_nothing:
    "Keep the current position unchanged while monitoring payroll exposure.",
};

const IMMEDIATE_ACTIONS: Record<DecisionAction, string[]> = {
  prioritize_alpha: [
    "Contact the target client today and confirm settlement timing.",
    "Document the expected payment date before committing payroll cash.",
    "Update the daily cash tracker as soon as the receivable lands.",
  ],
  delay_equipment: [
    "Pause the equipment purchase order before cash leaves the business.",
    "Notify the vendor and confirm the revised purchase timing.",
    "Ring-fence the preserved cash for payroll until the deadline passes.",
  ],
  early_payment_discount: [
    "Send the early-payment offer to overdue customers today.",
    "Confirm which invoices accept the discount before updating payroll plans.",
    "Track the margin given up against the cash pulled forward.",
  ],
  do_nothing: [
    "Review cash balance daily until payroll is due.",
    "Prepare a fallback decision if the payroll gap does not close.",
    "Reconvene the board before committing payroll cash.",
  ],
};

function tradeOffs(result: SimulationResult, board: AgentResponse[]): string[] {
  const boardLines = board.slice(0, 2).map((agent) => agent.recommendation);
  const actionLines: Record<DecisionAction, string[]> = {
    prioritize_alpha: [
      "Receivables recovery can protect cash, but payment timing remains uncertain.",
      "Aggressive follow-up may strain the client relationship.",
      "Payroll planning still depends on the payment arriving before the deadline.",
    ],
    delay_equipment: [
      "Cash is preserved immediately, but the operational upgrade is delayed.",
      "The business protects payroll by postponing a planned investment.",
      "Runway improves, but growth momentum may slow in the short term.",
    ],
    early_payment_discount: [
      "Cash arrives sooner, but the business gives up some margin.",
      "The offer works only if customers accept and pay quickly.",
      "Payroll coverage improves at the cost of discounted receivables.",
    ],
    do_nothing: [
      "No execution risk is introduced, but payroll exposure remains unresolved.",
      "Cash remains unchanged while the deadline continues to approach.",
      "The owner may need to revisit the decision if collections do not improve.",
    ],
  };

  const [primary, ...fallback] = actionLines[result.action];
  return [primary, ...boardLines, ...fallback].slice(0, 3);
}

function metricWatch(result: SimulationResult): string[] {
  return [
    `Cash balance: ${rm(result.updatedState.cashBalance)}`,
    `Payroll gap: ${rm(result.after.payrollGap)}`,
    `Runway: ${days(result.after.runwayDays)}`,
  ];
}

function impactLines(company: FinancialState, result: SimulationResult): string[] {
  const cashDelta = result.updatedState.cashBalance - company.cashBalance;
  const runwayDelta = Math.round(result.after.runwayDays - result.before.runwayDays);
  const payrollBefore = result.before.payrollRisk ? "exposed" : "protected";
  const payrollAfter = result.after.payrollRisk ? "exposed" : "protected";

  return [
    `Cash balance after decision: ${rm(result.updatedState.cashBalance)}.`,
    `Payroll moves from ${payrollBefore} to ${payrollAfter}.`,
    `Runway changes by ${runwayDelta >= 0 ? "+" : ""}${runwayDelta} days.`,
    `Projected payroll gap after decision: ${rm(result.after.payrollGap)}.`,
    `Cash movement from current balance: ${signedRm(cashDelta)}.`,
  ];
}

export default function ExecutiveActionPlan({
  company,
  result,
  board,
}: ExecutiveActionPlanProps) {
  return (
    <section className="mb-12 animate-[rise_0.45s_ease-out] rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm transition-all duration-200">
      <div className="flex flex-col gap-2 border-b border-neutral-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            Board Resolution
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
            Executive Action Plan
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            Prepared from the boardroom decision and deterministic simulation
            results.
          </p>
        </div>
        <div className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
          {company.companyName}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <PlanBlock title="Board Decision">
          <p>{result.label}</p>
        </PlanBlock>

        <PlanBlock title="Objective">
          <p>{OBJECTIVE_BY_ACTION[result.action]}</p>
        </PlanBlock>

        <PlanBlock title="Expected Financial Impact">
          <BulletList items={impactLines(company, result)} />
        </PlanBlock>

        <PlanBlock title="Trade-Offs">
          <BulletList items={tradeOffs(result, board)} />
        </PlanBlock>

        <PlanBlock title="Immediate Actions">
          <BulletList items={IMMEDIATE_ACTIONS[result.action]} />
        </PlanBlock>

        <PlanBlock title="Metrics to Watch">
          <BulletList items={metricWatch(result)} />
        </PlanBlock>
      </div>

      <div className="mt-5 rounded-xl bg-neutral-900 p-4 text-sm font-medium text-white">
        The board has presented its recommendations. The final decision is yours.
      </div>
    </section>
  );
}

function PlanBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="text-xs uppercase tracking-wider text-neutral-500">
        {title}
      </div>
      <div className="mt-2 text-sm leading-relaxed text-neutral-800">
        {children}
      </div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-1 text-neutral-300">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
