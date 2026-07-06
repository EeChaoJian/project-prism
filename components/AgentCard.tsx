// Placeholder agent card. Renders a structured (hardcoded) agent response.
// The AI integration in a later milestone will produce the same shape.

import type { AgentResponse } from "@/lib/agents";

const accentByAgent: Record<AgentResponse["agent"], string> = {
  CFO: "from-brand/20 to-transparent border-brand/40",
  "Collections Manager": "from-accent/20 to-transparent border-accent/40",
};

export default function AgentCard({ agent }: { agent: AgentResponse }) {
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-b ${accentByAgent[agent.agent]} bg-surface p-6 shadow-lg shadow-black/20`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{agent.agent}</h3>
          <p className="text-xs text-slate-400">{agent.role}</p>
        </div>
        <span className="rounded-full border border-edge px-2 py-1 text-xs text-slate-300">
          {Math.round(agent.confidence * 100)}% confidence
        </span>
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
    </div>
  );
}
