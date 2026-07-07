// POST /api/boardroom
//
// Streams the sequential boardroom as newline-delimited JSON (NDJSON). Every
// object conforms to BoardroomEvent (see lib/boardroom.ts), so the client can
// parse the stream back into strict types with no `any`.
//
// The run advances through multiple phases, emitting a boardroom thinking trace
// the UI renders live:
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

// Cadence for streamed log lines so the boardroom reads like a live trace. This
// is UI pacing only — it never gates the deterministic result.
const LOG_PACING_MS = 220;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const rm = (n: number) => `RM${Math.round(n).toLocaleString()}`;
const nonNegative = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : fallback;

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
    return {
      companyName:
        typeof state.companyName === "string" && state.companyName.trim()
          ? state.companyName.trim()
          : initialFinancialState.companyName,
      cashBalance: nonNegative(state.cashBalance),
      monthlyRevenue: Math.max(1, nonNegative(state.monthlyRevenue, 1)),
      monthlyOpex: Math.max(1, nonNegative(state.monthlyOpex, 1)),
      payrollAmount: Math.max(1, nonNegative(state.payrollAmount, 1)),
      payrollDueInDays: Math.max(1, nonNegative(state.payrollDueInDays, 1)),
      equipmentPurchase: nonNegative(state.equipmentPurchase),
      invoices: state.invoices.map((invoice, index) => {
        const inv = invoice as Partial<FinancialState["invoices"][number]>;
        return {
          client:
            typeof inv.client === "string" && inv.client.trim()
              ? inv.client.trim()
              : `Client ${index + 1}`,
          amount: nonNegative(inv.amount),
          daysOverdue: nonNegative(inv.daysOverdue),
          collectionProbability: Math.min(
            1,
            Math.max(0, nonNegative(inv.collectionProbability))
          ),
          relationshipRisk:
            inv.relationshipRisk === "Low" ||
            inv.relationshipRisk === "Medium" ||
            inv.relationshipRisk === "High"
              ? inv.relationshipRisk
              : "Medium",
        };
      }),
    };
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
      await log("[BOARDROOM]: Analyzing cash position...");
      await log(
        `[BOARDROOM]: Payroll is due in ${state.payrollDueInDays} days. Current gap: ${rm(
          health.payrollGap
        )}.`
      );
      // Synthetic benchmark context for the demo. This is not live market data.
      await log(
        "[BOARDROOM]: Reviewing synthetic benchmark data (illustrative demo only)..."
      );
      await log(
        "[BOARDROOM]: Comparing this scenario with a synthetic SME cash-flow cohort..."
      );
      await log(
        `[BOARDROOM]: Benchmark ${lookalikeCohortData.cohortId} loaded (synthetic n=${lookalikeCohortData.sampleSize}).`
      );
      await log("[BOARDROOM]: Preparing board recommendations...");

      // ---- PHASE: cfo_processing (INFERENCE 1) ----------------------------
      send({ type: "phase", phase: "cfo_processing" });
      await log("[CFO]: Reviewing payroll and operating burn...");
      let cfo: AgentResponse;
      try {
        cfo = await runCFO(state, health);
      } catch (err) {
        console.error("[boardroom] CFO inference failed:", err);
        source = "fallback";
        cfo = fallbackCfo;
        if (!online) await delay(400);
      }
      await log(`[CFO]: Recommendation ready — ${cfo.recommendation}`);
      send({ type: "agent", agent: cfo });

      // ---- PHASE: handoff_context -----------------------------------------
      send({ type: "phase", phase: "handoff_context" });
      await log("[BOARDROOM]: Reconciling stakeholder priorities...");

      // ---- PHASE: collections_processing (INFERENCE 2) --------------------
      send({ type: "phase", phase: "collections_processing" });
      await log("[COLLECTIONS]: Reviewing receivables recovery assumptions...");
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
      await log(`[COLLECTIONS]: Counterpoint ready — ${collections.recommendation}`);
      send({ type: "agent", agent: collections });

      // ---- PHASE: synchronized --------------------------------------------
      send({ type: "phase", phase: "synchronized" });
      await log("[BOARDROOM]: Board synchronized. Owner decision required.");
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
