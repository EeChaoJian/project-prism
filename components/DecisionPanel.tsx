// The owner's decision buttons. Options are built dynamically from the live
// business situation + decision assumptions (getDecisionOptions), so labels and
// figures always match what the simulation will actually execute. The
// deterministically-recommended option carries a badge.

import type { DecisionAction, DecisionOption } from "@/lib/simulation";

interface DecisionPanelProps {
  options: DecisionOption[];
  onDecide: (action: DecisionAction) => void;
  selected: DecisionAction | null;
  recommended?: DecisionAction;
}

export default function DecisionPanel({
  options,
  onDecide,
  selected,
  recommended,
}: DecisionPanelProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const isSelected = selected === option.action;
        const isRecommended = recommended === option.action;
        return (
          <button
            key={option.action}
            onClick={() => onDecide(option.action)}
            className={`rounded-xl border p-4 text-left shadow-sm transition-all duration-200 ${
              isSelected
                ? "border-neutral-900 bg-neutral-900"
                : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-md"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`font-medium ${
                  isSelected ? "text-white" : "text-neutral-900"
                }`}
              >
                {option.label}
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
            <div
              className={`mt-1 text-sm ${
                isSelected ? "text-neutral-400" : "text-neutral-500"
              }`}
            >
              {option.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
