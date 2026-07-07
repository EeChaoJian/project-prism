// Compare all options side by side.
//
// Every action is run through the deterministic engine (compareOptions) and
// shown with its payroll outcome, cash balance, and runway. The best option
// carries a "Recommended" badge. Clicking a row commits that decision.

import type { DecisionAction, OptionOutcome } from "@/lib/simulation";

const rm = (n: number) => `RM${Math.round(n).toLocaleString()}`;
const days = (n: number) => `${Math.round(n)}d`;

interface OptionComparisonProps {
  outcomes: OptionOutcome[];
  recommended: DecisionAction;
  selected: DecisionAction | null;
  onSelect: (action: DecisionAction) => void;
}

export default function OptionComparison({
  outcomes,
  recommended,
  selected,
  onSelect,
}: OptionComparisonProps) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm transition-all duration-200">
      <div className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight text-neutral-900">
          Compare all options
        </h3>
        <p className="text-xs text-neutral-500">
          Every option run through the simulation. Click one to commit it.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500">
              <th className="pb-2 pr-3 font-medium">Option</th>
              <th className="px-3 pb-2 font-medium">Payroll</th>
              <th className="px-3 pb-2 font-medium">Cash Balance</th>
              <th className="pb-2 pl-3 font-medium">Runway</th>
            </tr>
          </thead>
          <tbody>
            {outcomes.map((o) => {
              const isRecommended = o.action === recommended;
              const isSelected = o.action === selected;
              return (
                <tr
                  key={o.action}
                  onClick={() => onSelect(o.action)}
                  className={`cursor-pointer border-t border-neutral-200 transition-colors ${
                    isSelected
                      ? "bg-neutral-900 text-white"
                      : "hover:bg-neutral-50"
                  }`}
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium ${
                          isSelected ? "text-white" : "text-neutral-900"
                        }`}
                      >
                        {o.label}
                      </span>
                      {isRecommended && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            isSelected
                              ? "bg-white text-neutral-900"
                              : "bg-neutral-900 text-white"
                          }`}
                        >
                          Recommended
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={
                        o.protectsPayroll
                          ? "font-semibold"
                          : isSelected
                            ? "text-neutral-300"
                            : "text-neutral-500"
                      }
                    >
                      {o.protectsPayroll
                        ? "Covered"
                        : `Gap ${rm(o.payrollGapAfter)}`}
                    </span>
                  </td>
                  <td
                    className={`px-3 py-3 font-mono tabular-nums ${
                      isSelected ? "text-white" : "text-neutral-900"
                    }`}
                  >
                    {rm(o.cashAfter)}
                  </td>
                  <td
                    className={`py-3 pl-3 font-mono tabular-nums ${
                      isSelected ? "text-white" : "text-neutral-900"
                    }`}
                  >
                    {days(o.runwayAfter)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
