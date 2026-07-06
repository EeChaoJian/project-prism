// Agent card. Renders a structured agent response — either AI-generated
// (Fireworks) or the static fallback; both share the AgentResponse shape.

import type { AgentResponse } from "@/lib/agents";

const accentByAgent: Record<AgentResponse["agent"], string> = {
  CFO: "from-brand/20 to-transparent border-brand/40",
  "Collections Manager": "from-accent/20 to-transparent border-accent/40",
};

// Confidence Vector thresholds (Milestone 3, Task 2).
function confidenceFill(confidence: number): string {
  if (confidence >= 0.8) return "bg-emerald-500";
  if (confidence >= 0.5) return "bg-amber-500";
  return "bg-rose-500";
}

function ConfidenceVector({ confidence }: { confidence: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, confidence)) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="uppercase tracking-wider text-slate-400">
          Confidence Vector
        </span>
        <span className="font-mono font-semibold text-white">{pct}%</span>
      </div>
      <div
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/10"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Agent confidence"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${confidenceFill(
            confidence
          )}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AgentCard({ agent }: { agent: AgentResponse }) {
  return (
    <div
      className={`flex flex-col rounded-2xl border bg-gradient-to-b ${accentByAgent[agent.agent]} bg-surface p-6 shadow-lg shadow-black/20`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{agent.agent}</h3>
          <p className="text-xs text-slate-400">{agent.role}</p>
        </div>
      </div>

      <p className="mt-4 text-base font-medium text-white">{agent.headline}</p>
      <p className="mt-1 text-sm text-slate-300">{agent.position}</p>

      <div className="mt-4 rounded-xl border border-edge bg-panel/60 p-3">
        <div className="text-xs uppercase tracking-wider text-slate-400">
          Recommends
        </div>
        <div className="mt-1 text-sm font-medium text-accent">
          {agent.recommendedAction}
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {agent.reasoning.map((point, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-300">
            <span className="text-slate-500">•</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex gap-2 text-xs text-warn">
        <span className="font-semibold">Risk:</span>
        <span className="text-slate-400">{agent.risk}</span>
      </div>

      {/* Confidence Vector meter — pushed to the card foot for alignment. */}
      <div className="mt-5 border-t border-edge pt-4">
        <ConfidenceVector confidence={agent.confidence} />
      </div>
    </div>
  );
}
