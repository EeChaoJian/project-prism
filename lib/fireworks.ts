// Fireworks AI orchestration for the boardroom.
//
// This module is server-only (it reads FIREWORKS_API_KEY and calls the
// Fireworks inference API). It runs two SEQUENTIAL inferences:
//   1. The CFO evaluates the deterministic financial numbers.
//   2. The Collections Manager reads the CFO's literal output and responds.
//
// Every function here THROWS on any failure (missing key, HTTP error, bad
// JSON, missing fields). The API route catches those and falls back to the
// static mock boardroom in lib/agents.ts, so the demo never breaks.

import type { FinancialState } from "./financialState";
import type { FinancialHealth } from "./healthCheck";
import type { AgentResponse } from "./agents";

export const FIREWORKS_MODEL =
  process.env.FIREWORKS_MODEL ??
  "accounts/fireworks/models/llama-v3p1-70b-instruct";

const FIREWORKS_URL =
  "https://api.fireworks.ai/inference/v1/chat/completions";

// The two agents whose responses we generate, and the role blurb the UI shows.
const ROLE_BY_AGENT: Record<AgentResponse["agent"], string> = {
  CFO: "Focuses on liquidity, runway, and payroll stability.",
  "Collections Manager":
    "Focuses on recovering receivables and improving cash inflow.",
};

export function hasFireworksKey(): boolean {
  return Boolean(process.env.FIREWORKS_API_KEY);
}

const rm = (n: number) => `RM${Math.round(n).toLocaleString()}`;

// The shared financial context passed to every agent (MASTER_SPEC §14).
// All numbers come from the deterministic engine — agents may not invent them.
function buildContext(state: FinancialState, health: FinancialHealth): string {
  const invoices = state.invoices
    .map(
      (inv) =>
        `- ${inv.client}: ${rm(inv.amount)}, ${inv.daysOverdue} days overdue, ` +
        `${Math.round(inv.collectionProbability * 100)}% collection probability, ` +
        `${inv.relationshipRisk.toLowerCase()} relationship risk`
    )
    .join("\n");

  return [
    `Company: ${state.companyName}`,
    `Cash balance: ${rm(state.cashBalance)}`,
    `Monthly revenue: ${rm(state.monthlyRevenue)}`,
    `Monthly operating expenses: ${rm(state.monthlyOpex)}`,
    `Payroll amount: ${rm(state.payrollAmount)}`,
    `Payroll due in: ${state.payrollDueInDays} days`,
    `Expected collections: ${rm(health.expectedCollections)}`,
    `Operating burn before payroll: ${rm(health.operatingBurnToPayroll)}`,
    `Projected cash before payroll: ${rm(health.projectedCashBeforePayroll)}`,
    `Payroll gap: ${rm(health.payrollGap)}`,
    `Payroll risk: ${health.payrollRisk ? "YES" : "NO"}`,
    `Outstanding invoices:`,
    invoices,
  ].join("\n");
}

// Every agent must return exactly this shape.
const SCHEMA_INSTRUCTION = `Respond with a SINGLE valid JSON object and nothing else. Use exactly this schema:
{
  "agent": "string",
  "headline": "string",
  "position": "string",
  "recommendedAction": "string",
  "reasoning": ["string", "string", "string"],
  "risk": "string",
  "confidence": 0.00
}
Rules:
- "reasoning" must be an array of exactly three short strings.
- "confidence" is a number between 0 and 1.
- Only reference the financial figures provided. Never invent new numbers.`;

const CFO_SYSTEM = `You are the CFO of a small business, speaking in a financial boardroom.
You are cautious, direct, and numbers-focused, and you prioritise survival over growth.
You care about liquidity, runway, payroll stability, and protecting cash reserves.
${SCHEMA_INSTRUCTION}
Set "agent" to "CFO".`;

const COLLECTIONS_SYSTEM = `You are the Collections Manager of a small business, speaking in a financial boardroom immediately after the CFO.
You are practical, action-oriented, and client-aware, and you focus on recovering outstanding receivables and improving cash inflow.
You have just heard the CFO's position. Acknowledge the CFO's structural stance in your "position", then identify the friction points regarding outstanding receivables that the CFO's liquidity-first view overlooks.
${SCHEMA_INSTRUCTION}
Set "agent" to "Collections Manager".`;

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

// Low-level call: returns the raw message content string, or throws.
async function fireworksChat(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.FIREWORKS_API_KEY;
  if (!apiKey) throw new Error("Missing FIREWORKS_API_KEY");

  const res = await fetch(FIREWORKS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: FIREWORKS_MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 700,
      response_format: { type: "json_object" },
    }),
    // Guard against a hung request stalling the whole boardroom.
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Fireworks HTTP ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw new Error("Fireworks returned no message content");
  }
  return content;
}

// Parse + validate a model response into a strict AgentResponse, or throw.
function parseAgent(
  content: string,
  agent: AgentResponse["agent"]
): AgentResponse {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(content);
  } catch {
    // Some models wrap JSON in prose; recover the first {...} block.
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found in agent response");
    obj = JSON.parse(match[0]);
  }

  const reasoning = Array.isArray(obj.reasoning)
    ? obj.reasoning.map((r) => String(r)).filter((r) => r.trim() !== "")
    : [];

  if (
    !obj.headline ||
    !obj.position ||
    !obj.recommendedAction ||
    reasoning.length === 0
  ) {
    throw new Error("Agent JSON is missing required fields");
  }

  let confidence = Number(obj.confidence);
  if (!Number.isFinite(confidence)) confidence = 0.75;
  confidence = Math.min(1, Math.max(0, confidence));

  return {
    agent, // enforce the agent identity server-side
    role: ROLE_BY_AGENT[agent],
    headline: String(obj.headline),
    position: String(obj.position),
    recommendedAction: String(obj.recommendedAction),
    reasoning: reasoning.slice(0, 3),
    risk: String(obj.risk ?? ""),
    confidence,
  };
}

// INFERENCE 1 — the CFO evaluates the deterministic numbers.
export async function runCFO(
  state: FinancialState,
  health: FinancialHealth
): Promise<AgentResponse> {
  const content = await fireworksChat([
    { role: "system", content: CFO_SYSTEM },
    { role: "user", content: buildContext(state, health) },
  ]);
  return parseAgent(content, "CFO");
}

// INFERENCE 2 — the Collections Manager reads the CFO's literal output and
// composes a response that acknowledges the CFO's structural stance.
export async function runCollections(
  state: FinancialState,
  health: FinancialHealth,
  cfo: AgentResponse
): Promise<AgentResponse> {
  const userContent = [
    buildContext(state, health),
    "",
    "The CFO has already delivered this position (their verbatim JSON output):",
    JSON.stringify(cfo, null, 2),
    "",
    "Read the CFO's stance carefully. Acknowledge their structural position, then argue the receivables angle they underweight.",
  ].join("\n");

  const content = await fireworksChat([
    { role: "system", content: COLLECTIONS_SYSTEM },
    { role: "user", content: userContent },
  ]);
  return parseAgent(content, "Collections Manager");
}
