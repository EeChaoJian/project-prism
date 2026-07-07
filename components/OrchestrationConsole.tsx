"use client";

// Boardroom thinking trace.
//
// Renders the live boardroom trace streamed from /api/boardroom. The current
// phase is shown in the header and the newest line stays in view.

import { useEffect, useRef } from "react";
import { PHASE_LABEL, type BoardPhase } from "@/lib/boardroom";

interface OrchestrationConsoleProps {
  logs: string[];
  phase: BoardPhase;
  active: boolean; // true while the run is streaming
}

function LogLine({ line }: { line: string }) {
  const match = line.match(/^(\[[A-Z_-]+\]):?\s*(.*)$/);
  if (!match) {
    return <span className="text-neutral-500">{line}</span>;
  }
  const [, bracket, rest] = match;
  return (
    <>
      <span className="font-semibold text-neutral-900">{bracket}</span>
      <span className="text-neutral-500">: {rest}</span>
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
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 font-mono text-xs text-neutral-800">
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
        </div>
        <span className="font-medium text-neutral-500">
          Boardroom thinking
        </span>
        <span className="ml-auto flex items-center gap-2 text-[11px] text-neutral-500">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              active ? "animate-pulse bg-neutral-900" : "bg-neutral-300"
            }`}
          />
          {PHASE_LABEL[phase]}
        </span>
      </div>

      {/* Log body */}
      <div className="max-h-56 overflow-y-auto p-4 leading-relaxed">
        {logs.length === 0 ? (
          <div className="text-neutral-400">
            {active ? "preparing the board…" : "waiting for the board…"}
          </div>
        ) : (
          <ol className="space-y-1">
            {logs.map((line, i) => (
              <li key={i} className="whitespace-pre-wrap break-words">
                <span className="mr-2 select-none text-neutral-300">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <LogLine line={line} />
              </li>
            ))}
          </ol>
        )}

        {/* Blinking cursor while streaming (CSS-only, no timers → no leaks). */}
        {active && (
          <div className="mt-1 flex items-center gap-2">
            <span className="select-none text-neutral-300">
              {String(logs.length + 1).padStart(2, "0")}
            </span>
            <span className="inline-block h-3.5 w-2 animate-pulse bg-neutral-800" />
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}
