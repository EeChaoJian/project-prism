// Agent card — a board member's recommendation. Either AI-generated (Fireworks)
// or the static fallback; both share the AgentResponse shape. The executive's
// identity (name, title, stance) comes from the deterministic EXECUTIVES map.

import type { AgentResponse } from "@/lib/agents";
import { EXECUTIVES } from "@/lib/executives";

export default function AgentCard({
  agent,
  speaking = false,
}: {
  agent: AgentResponse;
  speaking?: boolean;
}) {
  const exec = EXECUTIVES[agent.agent];
  const scenarioConfidence = Math.round(agent.scenarioConfidence * 100);

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md ${
        speaking ? "border-neutral-900 ring-1 ring-neutral-900" : "border-neutral-200/80"
      }`}
    >
      {/* Executive identity */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">
          {exec.initials}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-tight text-neutral-900">
            {exec.name}
          </h3>
          <p className="truncate text-xs text-neutral-500">{exec.title}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
          {exec.style}
        </span>
        <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
          {exec.stance}
        </span>
      </div>

      {/* Headline */}
      <p className="mt-4 text-base font-semibold tracking-tight text-neutral-900">
        {agent.headline}
      </p>

      {/* Recommendation */}
      <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          Recommendation
        </div>
        <div className="mt-1 text-sm font-medium text-neutral-900">
          {agent.recommendation}
        </div>
      </div>

      {/* 3 bullets */}
      <ul className="mt-4 space-y-1.5">
        {agent.reasoning.slice(0, 3).map((point, i) => (
          <li key={i} className="flex gap-2 text-sm text-neutral-500">
            <span className="text-neutral-300">•</span>
            <span>{point}</span>
          </li>
        ))}
      </ul>

      {/* Risk + Confidence */}
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
            Scenario Confidence
          </div>
          <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-neutral-900">
            {scenarioConfidence}%
          </div>
          <div className="mt-0.5 text-[11px] text-neutral-400">
            Based on current assumptions
          </div>
        </div>
      </div>
    </div>
  );
}
