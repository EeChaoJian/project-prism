// Shared boardroom protocol — imported by BOTH the server route
// (app/api/boardroom/route.ts) and the client hook (lib/useBoardroom.ts).
//
// Keeping the event union in one place means the server can only emit events
// the client knows how to handle, and the client parses them back into the same
// types — no `any`, no drift between the two ends of the stream.
//
// This file is framework-agnostic (no React, no server-only APIs) so it is safe
// to import from either side.

import type { AgentResponse } from "./agents";

// The sequential phases of one boardroom run.
export type BoardPhase =
  | "idle"
  | "analyzing_metrics"
  | "cfo_processing"
  | "handoff_context"
  | "collections_processing"
  | "synchronized";

// Where the final agent data came from.
export type BoardSource = "fireworks" | "fallback" | "partial-fallback";

// The wire protocol: newline-delimited JSON, one object per line.
export type BoardroomEvent =
  | { type: "phase"; phase: BoardPhase }
  | { type: "log"; line: string }
  | { type: "agent"; agent: AgentResponse }
  | { type: "done"; source: BoardSource; model?: string };

export function isBoardroomEvent(value: unknown): value is BoardroomEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<BoardroomEvent>;

  if (event.type === "phase") {
    return (
      event.phase === "idle" ||
      event.phase === "analyzing_metrics" ||
      event.phase === "cfo_processing" ||
      event.phase === "handoff_context" ||
      event.phase === "collections_processing" ||
      event.phase === "synchronized"
    );
  }

  if (event.type === "log") return typeof event.line === "string";

  if (event.type === "agent") {
    const agent = event.agent;
    return (
      Boolean(agent) &&
      (agent?.agent === "CFO" || agent?.agent === "Collections Manager") &&
      typeof agent?.role === "string" &&
      typeof agent?.headline === "string" &&
      typeof agent?.recommendation === "string" &&
      Array.isArray(agent?.reasoning) &&
      agent.reasoning.every((line) => typeof line === "string") &&
      typeof agent?.risk === "string" &&
      typeof agent?.payrollCoverageScore === "number" &&
      Number.isFinite(agent.payrollCoverageScore)
    );
  }

  if (event.type === "done") {
    return (
      (event.source === "fireworks" ||
        event.source === "fallback" ||
        event.source === "partial-fallback") &&
      (event.model === undefined || typeof event.model === "string")
    );
  }

  return false;
}

// Labels for the compact two-step indicator.
export const BOARDROOM_STEPS = [
  "Loading CFO...",
  "Loading Collections...",
];

// Human-readable label for the current phase (shown in the console header).
export const PHASE_LABEL: Record<BoardPhase, string> = {
  idle: "Idle",
  analyzing_metrics: "Reviewing the scenario",
  cfo_processing: "Maya Chen (CFO) — analyzing liquidity",
  handoff_context: "Reconciling priorities",
  collections_processing: "Daniel Reyes (Collections) — reviewing receivables",
  synchronized: "Board synchronized",
};

// Map a phase to the 1-based active step for the compact stepper.
export function phaseToActiveStep(phase: BoardPhase): number {
  switch (phase) {
    case "cfo_processing":
      return 1;
    case "handoff_context":
    case "collections_processing":
      return 2;
    default:
      return 0;
  }
}
