// The owner's decision buttons. Options are built dynamically from the live
// financial state + decision parameters (getDecisionOptions), so labels and
// figures always match what the simulation will actually execute.

import type { DecisionAction, DecisionOption } from "@/lib/simulation";

interface DecisionPanelProps {
  options: DecisionOption[];
  onDecide: (action: DecisionAction) => void;
  selected: DecisionAction | null;
}

export default function DecisionPanel({
  options,
  onDecide,
  selected,
}: DecisionPanelProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const isSelected = selected === option.action;
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
            <div
              className={`font-medium ${
                isSelected ? "text-white" : "text-neutral-900"
              }`}
            >
              {option.label}
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
