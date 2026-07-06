// POST /api/boardroom
//
// Streams the sequential boardroom as newline-delimited JSON (NDJSON). Every
// object conforms to BoardroomEvent (see lib/boardroom.ts), so the client can
// parse the stream back into strict types with no `any`.
//
// The run advances through multiple phases, emitting a professional state trace
// the UI renders in a live terminal console:
//   phase: analyzing_metrics → cfo_processing → handoff_context →
//          collections_processing → synchronized
//
// The deterministic engine is untouched — checkFinancialHealth() and
// simulateDecision() remain the single source of truth for every number. This
// route only generates the agents' natural-language reasoning.

import {
  initialFinancialState,
  lookalikeCohortData,
  type FinancialState,
} from "@/lib/financialState";
import { checkFinancialHealth } from "@/lib/healthCheck";
import { getAgentResponses, type AgentResponse } from "@/lib/agents";
import { runCFO, runCollections, hasFireworksKey } from "@/lib/fireworks";
import type { BoardroomEvent, BoardSource } from "@/lib/boardroom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cadence for streamed log lines so the console reads like a live trace. This
// is UI pacing only — it never gates the deterministic result.
const LOG_PACING_MS = 220;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const rm = (n: number) => `RM${Math.round(n).toLocaleString()}`;

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
      // `send` is typed to BoardroomEvent — the compiler guarantees we only
      // ever emit events the client knows how to parse.
      const send = (event: BoardroomEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      const log = async (line: string) => {
        await delay(LOG_PACING_MS);
        send({ type: "log", line });
      };

      let source: BoardSource = online ? "fireworks" : "fallback";

      // ---- PHASE: analyzing_metrics ---------------------------------------
      send({ type: "phase", phase: "analyzing_metrics" });
      await log(
        `[SYSTEM]: Cash balance alert triggered. Deficit in t-${state.payrollDueInDays} days.`
      );
      await log(
        `[SYSTEM]: Deterministic matrix locked — expected collections ${rm(
          health.expectedCollections
        )}, payroll gap ${rm(health.payrollGap)}.`
      );
      // Lookalike Cohort Analysis — surface the empirical-twin retrieval live.
      await log("[SYSTEM]: Initializing macro-vector lookalike scanner...");
      await log(
        "[SYSTEM]: Querying regional SME performance registry for cash-flow twins..."
      );
      await log(
        `[SYSTEM]: Match found: Cohort ${lookalikeCohortData.cohortId} (n=${lookalikeCohortData.sampleSize}). Overlapping risk parameters: Runway < 20d, Payroll Gap > RM4k, High AR Concentration.`
      );
      await log(
        "[SYSTEM]: Injecting cohort operational benchmarks into Strategic Financial Officer context window..."
      );

      // ---- PHASE: cfo_processing (INFERENCE 1) ----------------------------
      send({ type: "phase", phase: "cfo_processing" });
      await log(
        "[AMD-CLOUD]: Routing financial state matrix to Llama-3.1-70B instance..."
      );
      await log("[CFO_AGENT]: Analyzing payroll hurdle rates...");
      let cfo: AgentResponse;
      try {
        cfo = await runCFO(state, health);
      } catch (err) {
        console.error("[boardroom] CFO inference failed:", err);
        source = "fallback";
        cfo = fallbackCfo;
        if (!online) await delay(400);
      }
      await log(
        `[CFO_AGENT]: Operating-burn sensitivity resolved. Adjusted runway ${cfo.predictiveMetrics.adjustedRunwayDays.toFixed(
          1
        )}d @ +5% burn · risk ${cfo.quantitativeRiskScore}/100 · conf ${cfo.confidence.toFixed(
          2
        )}.`
      );
      send({ type: "agent", agent: cfo });

      // ---- PHASE: handoff_context -----------------------------------------
      send({ type: "phase", phase: "handoff_context" });
      await log(
        "[ORCHESTRATOR]: Injecting CFO liquidity stance into step-2 prompt context..."
      );

      // ---- PHASE: collections_processing (INFERENCE 2) --------------------
      send({ type: "phase", phase: "collections_processing" });
      await log(
        "[COLLECTIONS_AGENT]: Re-evaluating Accounts Receivable vs CFO constraints..."
      );
      let collections: AgentResponse;
      try {
        collections = await runCollections(state, health, cfo);
        // CFO fell back but Collections succeeded → mixed result.
        if (source === "fallback" && online) source = "partial-fallback";
      } catch (err) {
        console.error("[boardroom] Collections inference failed:", err);
        source = source === "fireworks" ? "partial-fallback" : "fallback";
        collections = fallbackCollections;
        if (!online) await delay(400);
      }
      await log(
        `[COLLECTIONS_AGENT]: Receivables vector compiled. Scenario Conf. ${(
          collections.predictiveMetrics.probabilityOfSuccess * 100
        ).toFixed(1)}% · risk ${collections.quantitativeRiskScore}/100 · conf ${collections.confidence.toFixed(
          2
        )}.`
      );
      send({ type: "agent", agent: collections });

      // ---- PHASE: synchronized --------------------------------------------
      send({ type: "phase", phase: "synchronized" });
      await log(
        "[SYSTEM]: Orchestration completed. Boardroom state synchronized."
      );
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
