// POST /api/boardroom
//
// Streams the sequential boardroom as newline-delimited JSON (NDJSON) events so
// the UI can show a live "Step 1 → Step 2" indicator:
//   { "type": "step",  "step": 1, "label": "..." }
//   { "type": "agent", "agent": { ...AgentResponse } }
//   { "type": "step",  "step": 2, "label": "..." }
//   { "type": "agent", "agent": { ...AgentResponse } }
//   { "type": "done",  "source": "fireworks" | "fallback" | "partial-fallback" }
//
// The deterministic engine is untouched — checkFinancialHealth() and
// simulateDecision() remain the single source of truth for every number. This
// route only generates the agents' natural-language reasoning.

import { initialFinancialState, type FinancialState } from "@/lib/financialState";
import { checkFinancialHealth } from "@/lib/healthCheck";
import { getAgentResponses, type AgentResponse } from "@/lib/agents";
import { runCFO, runCollections, hasFireworksKey } from "@/lib/fireworks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Small delay so the sequential indicator is visible even in offline fallback
// mode (when there is no real network latency to watch).
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const STEP_1_LABEL = "Step 1: CFO Analyzing Liquidity Baseline...";
const STEP_2_LABEL =
  "Step 2: Collections Manager Evaluating Outstanding Account Receivables...";

// Accept a posted state only if it structurally looks like a FinancialState;
// otherwise fall back to the hardcoded demo company.
function resolveState(body: unknown): FinancialState {
  const state = (body as { state?: unknown } | null)?.state as
    | Partial<FinancialState>
    | undefined;
  if (
    state &&
    typeof state.cashBalance === "number" &&
    typeof state.payrollAmount === "number" &&
    typeof state.monthlyOpex === "number" &&
    Array.isArray(state.invoices)
  ) {
    return state as FinancialState;
  }
  return initialFinancialState;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const state = resolveState(body);
  const health = checkFinancialHealth(state);

  // Static mock boardroom — our guaranteed fallback [CFO, Collections].
  const [fallbackCfo, fallbackCollections] = getAgentResponses(state);
  const online = hasFireworksKey();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      let source: "fireworks" | "fallback" | "partial-fallback" = online
        ? "fireworks"
        : "fallback";

      // ---- INFERENCE 1: CFO ------------------------------------------------
      send({ type: "step", step: 1, label: STEP_1_LABEL });
      let cfo: AgentResponse;
      try {
        cfo = await runCFO(state, health);
      } catch (err) {
        console.error("[boardroom] CFO inference failed:", err);
        source = "fallback";
        cfo = fallbackCfo;
        if (!online) await delay(600);
      }
      send({ type: "agent", agent: cfo });

      // ---- INFERENCE 2: Collections Manager (reads the CFO's output) -------
      send({ type: "step", step: 2, label: STEP_2_LABEL });
      let collections: AgentResponse;
      try {
        collections = await runCollections(state, health, cfo);
        // CFO fell back but Collections succeeded → mixed result.
        if (source === "fallback" && online) source = "partial-fallback";
      } catch (err) {
        console.error("[boardroom] Collections inference failed:", err);
        source = source === "fireworks" ? "partial-fallback" : "fallback";
        collections = fallbackCollections;
        if (!online) await delay(600);
      }
      send({ type: "agent", agent: collections });

      send({ type: "done", source });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
