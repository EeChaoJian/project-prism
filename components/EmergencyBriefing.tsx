// Emergency briefing — the first screen. A cinematic crisis snapshot of the
// current business, with the strong CTA into the boardroom. All numbers come
// from the deterministic health check.

import type { FinancialState } from "@/lib/financialState";
import type { FinancialHealth } from "@/lib/healthCheck";
import { riskLevel } from "@/lib/risk";
import RiskBadge from "@/components/RiskBadge";

const rm = (n: number) => `RM${Math.round(n).toLocaleString()}`;

interface EmergencyBriefingProps {
  company: FinancialState;
  health: FinancialHealth;
  onEnter: () => void;
  onEdit: () => void;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-white/50">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tracking-tight text-white">
        {value}
      </div>
    </div>
  );
}

export default function EmergencyBriefing({
  company,
  health,
  onEnter,
  onEdit,
}: EmergencyBriefingProps) {
  const level = riskLevel(company, health);

  const briefing = health.payrollRisk
    ? `Even with ${rm(
        health.expectedCollections
      )} of expected collections, projected cash falls ${rm(
        health.payrollGap
      )} short of the ${rm(company.payrollAmount)} payroll due in ${
        company.payrollDueInDays
      } days.`
    : `${company.companyName} is projected to cover the ${rm(
        company.payrollAmount
      )} payroll due in ${company.payrollDueInDays} days.`;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Title */}
      <div className="mb-6 text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Project Prism
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
          AI Boardroom for SME Financial Decisions
        </h1>
      </div>

      {/* Emergency card */}
      <div className="rounded-2xl bg-neutral-900 p-6 text-white shadow-md sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-semibold uppercase tracking-widest text-white/70">
            Emergency Board Meeting Required
          </div>
          <RiskBadge level={level} onDark />
        </div>

        <div className="mt-4 text-sm text-white/60">Company</div>
        <div className="text-xl font-semibold tracking-tight">
          {company.companyName}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <Metric label="Cash Available" value={rm(company.cashBalance)} />
          <Metric
            label="Payroll Due"
            value={`${company.payrollDueInDays} days`}
          />
          <Metric
            label="Projected Shortfall"
            value={health.payrollRisk ? rm(health.payrollGap) : "Covered"}
          />
          <Metric
            label="Runway"
            value={`${Math.round(health.runwayDays)} days`}
          />
        </div>

        <div className="mt-6 border-t border-white/10 pt-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/50">
            Briefing
          </div>
          <p className="mt-2 text-sm leading-relaxed text-neutral-300">
            {briefing}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={onEnter}
            className="rounded-xl bg-white px-6 py-3 text-base font-semibold text-neutral-900 shadow-sm transition-all hover:bg-neutral-100 active:scale-[0.98]"
          >
            Enter Boardroom →
          </button>
          <button
            onClick={onEdit}
            className="rounded-xl border border-white/20 px-5 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/40 hover:text-white"
          >
            Edit business details
          </button>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-neutral-400">
        Numbers come from a deterministic simulation. The AI board explains the
        trade-offs — it never invents the outcome.
      </p>
    </div>
  );
}
