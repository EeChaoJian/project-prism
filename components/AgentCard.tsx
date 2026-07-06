// Agent card. Renders a structured agent response — either AI-generated
// (Fireworks) or the static fallback; both share the AgentResponse shape.

import type { AgentResponse } from "@/lib/agents";

function ConfidenceVector({ confidence }: { confidence: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, confidence)) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="uppercase tracking-wider text-neutral-500">
          Confidence Vector
        </span>
        <span className="font-mono font-semibold text-neutral-900">{pct}%</span>
      </div>
      <div
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-neutral-200"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Agent confidence"
      >
        <div
          className="h-full rounded-full bg-neutral-900 transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AgentCard({ agent }: { agent: AgentResponse }) {
  return (
    <div className="flex flex-col rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-neutral-900">
            {agent.agent}
          </h3>
          <p className="text-xs text-neutral-500">{agent.role}</p>
        </div>
      </div>

      <p className="mt-4 text-base font-semibold tracking-tight text-neutral-900">
        {agent.headline}
      </p>
      <p className="mt-1 text-sm text-neutral-500">{agent.position}</p>

      <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          Recommends
        </div>
        <div className="mt-1 text-sm font-medium text-neutral-900">
          {agent.recommendedAction}
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {agent.reasoning.map((point, i) => (
          <li key={i} className="flex gap-2 text-sm text-neutral-500">
            <span className="text-neutral-300">•</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex gap-2 text-xs">
        <span className="font-semibold text-neutral-900">Risk:</span>
        <span className="text-neutral-500">{agent.risk}</span>
      </div>

      {/* Confidence Vector meter — pushed to the card foot for alignment. */}
      <div className="mt-5 border-t border-neutral-200 pt-4">
        <ConfidenceVector confidence={agent.confidence} />
      </div>
    </div>
  );
}
