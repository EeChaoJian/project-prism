"use client";

// Client hook that drives the boardroom UI. It POSTs the financial state to
// /api/boardroom and reads the streamed NDJSON events, updating state as each
// step and agent arrives. If the request itself fails, it falls back to the
// static mock boardroom so the demo never breaks.

import { useCallback, useState } from "react";
import type { FinancialState } from "./financialState";
import { getAgentResponses, type AgentResponse } from "./agents";

export const BOARDROOM_STEPS = [
  "Step 1: CFO Analyzing Liquidity Baseline...",
  "Step 2: Collections Manager Evaluating Outstanding Account Receivables...",
];

export type BoardSource = "fireworks" | "fallback" | "partial-fallback";
export type BoardStatus = "idle" | "running" | "done";

type BoardEvent =
  | { type: "step"; step: number; label: string }
  | { type: "agent"; agent: AgentResponse }
  | { type: "done"; source: BoardSource };

interface BoardroomState {
  status: BoardStatus;
  board: AgentResponse[];
  activeStep: number; // 1-based index currently processing (0 = none)
  source: BoardSource | null;
}

const IDLE: BoardroomState = {
  status: "idle",
  board: [],
  activeStep: 0,
  source: null,
};

export function useBoardroom() {
  const [state, setState] = useState<BoardroomState>(IDLE);

  const convene = useCallback(async (financial: FinancialState) => {
    setState({ status: "running", board: [], activeStep: 0, source: null });

    const handle = (evt: BoardEvent) => {
      if (evt.type === "step") {
        setState((s) => ({ ...s, activeStep: evt.step }));
      } else if (evt.type === "agent") {
        setState((s) => ({ ...s, board: [...s.board, evt.agent] }));
      } else if (evt.type === "done") {
        setState((s) => ({
          ...s,
          status: "done",
          source: evt.source,
          activeStep: 0,
        }));
      }
    };

    try {
      const res = await fetch("/api/boardroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: financial }),
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
            if (line) handle(JSON.parse(line) as BoardEvent);
            nl = buffer.indexOf("\n");
          }
        }
      }

      const rest = buffer.trim();
      if (rest) handle(JSON.parse(rest) as BoardEvent);

      // Safety net: if the stream closed without an explicit "done" event.
      setState((s) =>
        s.status === "running" ? { ...s, status: "done", activeStep: 0 } : s
      );
    } catch (err) {
      console.error("[boardroom] client error, using static fallback:", err);
      const [cfo, collections] = getAgentResponses(financial);
      setState({
        status: "done",
        board: [cfo, collections],
        activeStep: 0,
        source: "fallback",
      });
    }
  }, []);

  return { ...state, convene };
}
