// The owner's decision buttons. Clicking a button runs a deterministic
// simulation in the parent, which then renders the before/after result.

import { decisionOptions, type DecisionAction } from "@/lib/simulation";

interface DecisionPanelProps {
  onDecide: (action: DecisionAction) => void;
  selected: DecisionAction | null;
}

export default function DecisionPanel({ onDecide, selected }: DecisionPanelProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {decisionOptions.map((option) => {
        const isSelected = selected === option.action;
        return (
          <button
            key={option.action}
            onClick={() => onDecide(option.action)}
            className={`rounded-xl border p-4 text-left transition ${
              isSelected
                ? "border-brand bg-brand/15"
                : "border-edge bg-surface hover:border-brand/60 hover:bg-surface/80"
            }`}
          >
            <div className="font-medium text-white">{option.label}</div>
            <div className="mt-1 text-sm text-slate-400">{option.description}</div>
          </button>
        );
      })}
    </div>
  );
}
