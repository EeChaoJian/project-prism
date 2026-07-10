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

import { initialFinancialState, type FinancialState } from "@/lib/financialState";
import { checkFinancialHealth } from "@/lib/healthCheck";
import { getAgentResponses, type AgentResponse } from "@/lib/agents";
import {
  configuredFireworksModel,
  runCFO,
  runCollections,
  hasFireworksKey,
} from "@/lib/fireworks";
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
const positive = (value: unknown, fallback = 1) =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const relationshipRisk = (
  value: unknown
): FinancialState["invoices"][number]["relationshipRisk"] =>
  value === "Low" || value === "Medium" || value === "High"
    ? value
    : "Medium";

function resolveInvoices(value: unknown): FinancialState["invoices"] | null {
  if (!Array.isArray(value)) return null;
  const invoices = value
    .map((invoice, index) => {
      if (!isRecord(invoice)) return null;
      return {
        client:
          typeof invoice.client === "string" && invoice.client.trim()
            ? invoice.client.trim()
            : `Client ${index + 1}`,
        amount: nonNegative(invoice.amount),
        daysOverdue: nonNegative(invoice.daysOverdue),
        collectionProbability: Math.min(
          1,
          Math.max(0, nonNegative(invoice.collectionProbability))
        ),
        relationshipRisk: relationshipRisk(invoice.relationshipRisk),
      };
    })
    .filter((invoice): invoice is FinancialState["invoices"][number] =>
      Boolean(invoice)
    );

  return invoices.length === value.length ? invoices : null;
}

// Accept a posted state only if it structurally looks like a FinancialState;
// otherwise fall back to the hardcoded demo company.
function resolveState(body: unknown): FinancialState {
  if (!isRecord(body) || !isRecord(body.state)) return initialFinancialState;
  const state = body.state;
  const invoices = resolveInvoices(state.invoices);
  if (!invoices) return initialFinancialState;

  return {
    companyName:
      typeof state.companyName === "string" && state.companyName.trim()
        ? state.companyName.trim()
        : initialFinancialState.companyName,
    cashBalance: nonNegative(state.cashBalance),
    monthlyRevenue: positive(state.monthlyRevenue),
    monthlyOpex: positive(state.monthlyOpex),
    payrollAmount: positive(state.payrollAmount),
    payrollDueInDays: positive(state.payrollDueInDays),
    equipmentPurchase: nonNegative(state.equipmentPurchase),
    invoices,
  };
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
      send({
        type: "done",
        source,
        model: source === "fallback" ? undefined : configuredFireworksModel(),
      });
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
