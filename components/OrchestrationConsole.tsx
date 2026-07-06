"use client";

// Boardroom Live Orchestration Console.
//
// A terminal-style panel that renders the live state trace streamed from
// /api/boardroom. Each log line is colour-coded by its [TAG] prefix, and the
// current phase is shown in the header. Auto-scrolls to the newest line.

import { useEffect, useRef } from "react";
import { PHASE_LABEL, type BoardPhase } from "@/lib/boardroom";

interface OrchestrationConsoleProps {
  logs: string[];
  phase: BoardPhase;
  active: boolean; // true while the run is streaming
}

// Colour per log source tag.
function tagColor(tag: string): string {
  switch (tag) {
    case "SYSTEM":
      return "text-cyan-400";
    case "AMD-CLOUD":
      return "text-red-400";
    case "CFO_AGENT":
      return "text-indigo-300";
    case "ORCHESTRATOR":
      return "text-amber-300";
    case "COLLECTIONS_AGENT":
      return "text-teal-300";
    default:
      return "text-slate-300";
  }
}

function LogLine({ line }: { line: string }) {
  const match = line.match(/^(\[[A-Z_-]+\]):?\s*(.*)$/);
  if (!match) {
    return <span className="text-slate-300">{line}</span>;
  }
  const [, bracket, rest] = match;
  const tag = bracket.slice(1, -1);
  return (
    <>
      <span className={`${tagColor(tag)} font-semibold`}>{bracket}</span>
      <span className="text-slate-300">: {rest}</span>
    </>
  );
}

export default function OrchestrationConsole({
  logs,
  phase,
  active,
}: OrchestrationConsoleProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest line whenever a line is appended.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [logs.length]);

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-zinc-950 shadow-lg shadow-black/40">
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-white/10 bg-black/40 px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-3 w-3 rounded-full bg-red-500/80" />
          <span className="h-3 w-3 rounded-full bg-amber-400/80" />
          <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
        </div>
        <span className="font-mono text-xs font-medium text-slate-300">
          Boardroom Live Orchestration Console
        </span>
        <span className="ml-auto flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              active ? "animate-pulse bg-emerald-400" : "bg-slate-600"
            }`}
          />
          {PHASE_LABEL[phase]}
        </span>
      </div>

      {/* Log body */}
      <div className="max-h-56 overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed">
        {logs.length === 0 ? (
          <div className="text-slate-500">
            {active ? "initializing orchestration…" : "awaiting orchestration…"}
          </div>
        ) : (
          <ol className="space-y-1">
            {logs.map((line, i) => (
              <li key={i} className="whitespace-pre-wrap break-words">
                <span className="mr-2 select-none text-slate-600">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <LogLine line={line} />
              </li>
            ))}
          </ol>
        )}

        {/* Blinking cursor while streaming (CSS-only, no timers → no leaks). */}
        {active && (
          <div className="mt-1 flex items-center gap-2 text-emerald-400">
            <span className="select-none text-slate-600">
              {String(logs.length + 1).padStart(2, "0")}
            </span>
            <span className="inline-block h-3.5 w-2 animate-pulse bg-emerald-400" />
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}
