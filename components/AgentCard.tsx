// Agent card. Renders a structured agent response — either AI-generated
// (Fireworks) or the static fallback; both share the AgentResponse shape.
//
// Intentionally concise: each card shows headline, recommendation, three
// reasoning bullets, a risk read, and a confidence read — nothing more.

import type { AgentResponse } from "@/lib/agents";

function band(value01: number): "Low" | "Moderate" | "High" {
  if (value01 >= 0.67) return "High";
  if (value01 >= 0.34) return "Moderate";
  return "Low";
}

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, confidence)) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="uppercase tracking-wider text-neutral-500">
          Confidence
        </span>
        <span className="font-medium text-neutral-900">
          {band(confidence)} ·{" "}
          <span className="font-mono tabular-nums">{pct}%</span>
        </span>
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
  // Risk score is 0..100 (higher = riskier); express its band on the same scale.
  const riskBand = band(agent.quantitativeRiskScore / 100);

  return (
    <div className="flex flex-col rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-neutral-900">
          {agent.agent}
        </h3>
        <p className="text-xs text-neutral-500">{agent.role}</p>
      </div>

      {/* Headline */}
      <p className="mt-4 text-base font-semibold tracking-tight text-neutral-900">
        {agent.headline}
      </p>

      {/* Recommendation */}
      <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          Recommends
        </div>
        <div className="mt-1 text-sm font-medium text-neutral-900">
          {agent.recommendedAction}
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
      <div className="mt-5 border-t border-neutral-200 pt-4">
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="uppercase tracking-wider text-neutral-500">Risk</span>
          <span className="font-medium text-neutral-900">
            {riskBand} ·{" "}
            <span className="font-mono tabular-nums">
              {agent.quantitativeRiskScore}/100
            </span>
          </span>
        </div>
        <ConfidenceMeter confidence={agent.confidence} />
      </div>
    </div>
  );
}
