"use client";

// Client hook that drives the boardroom UI. It POSTs the financial state to
// /api/boardroom and reads the streamed NDJSON events, updating state as each
// phase, log line, and agent arrives.
//
// Robustness (Milestone 3, Task 3):
//   - A monotonic run id + AbortController ensure a superseded run can never
//     write to state, so there are no overlapping streams or stale re-renders.
//   - The event union is imported from lib/boardroom, so parsing is fully typed.
//   - If the request itself fails, we fall back to the static mock boardroom.

import { useCallback, useRef, useState } from "react";
import type { FinancialState } from "./financialState";
import { getAgentResponses, type AgentResponse } from "./agents";
import { isBoardroomEvent, phaseToActiveStep } from "./boardroom";
import type { BoardPhase, BoardSource, BoardroomEvent } from "./boardroom";

export type BoardStatus = "idle" | "running" | "done";

interface BoardroomState {
  status: BoardStatus;
  phase: BoardPhase;
  logs: string[];
  board: AgentResponse[];
  source: BoardSource | null;
  model: string | null;
}

const IDLE_STATE: BoardroomState = {
  status: "idle",
  phase: "idle",
  logs: [],
  board: [],
  source: null,
  model: null,
};

export function useBoardroom() {
  const [state, setState] = useState<BoardroomState>(IDLE_STATE);
  const runIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const convene = useCallback(async (financial: FinancialState) => {
    // Claim a new run id and cancel any run still in flight.
    const runId = ++runIdRef.current;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    // Only the current run may touch state.
    const apply = (updater: (prev: BoardroomState) => BoardroomState) => {
      if (runIdRef.current === runId) setState(updater);
    };

    apply(() => ({
      status: "running",
      phase: "idle",
      logs: [],
      board: [],
      source: null,
      model: null,
    }));

    const handle = (event: BoardroomEvent) => {
      switch (event.type) {
        case "phase":
          apply((s) => ({ ...s, phase: event.phase }));
          break;
        case "log":
          apply((s) => ({ ...s, logs: [...s.logs, event.line] }));
          break;
        case "agent":
          apply((s) => ({ ...s, board: [...s.board, event.agent] }));
          break;
        case "done":
          apply((s) => ({
            ...s,
            status: "done",
            source: event.source,
            model: event.model ?? null,
            phase: "synchronized",
          }));
          break;
      }
    };

    const parseAndHandle = (line: string) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        console.warn("[boardroom] ignored malformed stream JSON");
        return;
      }

      if (!isBoardroomEvent(parsed)) {
        console.warn("[boardroom] ignored unknown stream event", parsed);
        return;
      }

      handle(parsed);
    };

    try {
      const res = await fetch("/api/boardroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: financial }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error(`Boardroom request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamDone = false;

      while (!streamDone) {
        const chunk = await reader.read();
        streamDone = chunk.done;
        if (chunk.value) {
          buffer += decoder.decode(chunk.value, { stream: true });
          let nl = buffer.indexOf("\n");
          while (nl >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (line) parseAndHandle(line);
            nl = buffer.indexOf("\n");
          }
        }
      }

      const rest = buffer.trim();
      if (rest) parseAndHandle(rest);

      // Safety net: stream closed without an explicit "done" event.
      apply((s) =>
        s.status === "running"
          ? { ...s, status: "done", phase: "synchronized" }
          : s
      );
    } catch (err) {
      // A superseded run was aborted on purpose — leave the new run alone.
      if (controller.signal.aborted) return;

      console.error("[boardroom] client error, using static fallback:", err);
      const [cfo, collections] = getAgentResponses(financial);
      apply(() => ({
        status: "done",
        phase: "synchronized",
        logs: [
          "[BOARDROOM]: Live boardroom unavailable.",
          "[BOARDROOM]: Restoring prepared recommendations...",
          "[BOARDROOM]: Board synchronized. Owner decision required.",
        ],
        board: [cfo, collections],
        source: "fallback",
        model: null,
      }));
    }
  }, []);

  // Clear the boardroom entirely — used when the company profile changes so a
  // stale board can never be shown against fresh financial data.
  const reset = useCallback(() => {
    runIdRef.current += 1; // invalidate any in-flight run
    controllerRef.current?.abort();
    setState(IDLE_STATE);
  }, []);

  const activeStep = phaseToActiveStep(state.phase);

  return { ...state, activeStep, convene, reset };
}
