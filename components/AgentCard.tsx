// Agent card. Renders a structured agent response — either AI-generated
// (Fireworks) or the static fallback; both share the AgentResponse shape.

import type { AgentResponse } from "@/lib/agents";

export default function AgentCard({ agent }: { agent: AgentResponse }) {
  const confidenceLabel =
    agent.scenarioConfidence >= 0.8
      ? "High confidence"
      : agent.scenarioConfidence >= 0.55
        ? "Medium confidence"
        : "Low confidence";

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

      <p className="mt-5 text-base font-semibold tracking-tight text-neutral-900">
        {agent.headline}
      </p>

      <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          Recommendation
        </div>
        <div className="mt-1 text-sm font-medium text-neutral-900">
          {agent.recommendation}
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {agent.reasoning.slice(0, 3).map((point, i) => (
          <li key={i} className="flex gap-2 text-sm text-neutral-500">
            <span className="text-neutral-300">•</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 grid gap-3 border-t border-neutral-200 pt-4 sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            Primary Risk
          </div>
          <div className="mt-1 text-sm font-medium leading-snug text-neutral-900">
            {agent.risk}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            Confidence this protects payroll
          </div>
          <div className="mt-1 text-lg font-semibold tracking-tight text-neutral-900">
            {confidenceLabel}
          </div>
          <div className="mt-0.5 text-[11px] text-neutral-400">
            Based on current assumptions
          </div>
        </div>
      </div>
    </div>
  );
}
