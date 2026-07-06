// Fireworks AI orchestration for the boardroom.
//
// This module is server-only (it reads FIREWORKS_API_KEY and calls the
// Fireworks inference API). It runs two SEQUENTIAL inferences:
//   1. The CFO — an elite quantitative VC analyst — models macro-economic
//      sensitivity of runway to a ±5% operating-burn variance.
//   2. The Collections Manager — a risk operations analyst — reads the CFO's
//      literal output and computes a probability-weighted receivables vector.
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
  CFO: "Elite quantitative VC analyst — liquidity, runway, and payroll stability.",
  "Collections Manager":
    "Expert risk operations analyst — receivables recovery and cash inflow.",
};

export function hasFireworksKey(): boolean {
  return Boolean(process.env.FIREWORKS_API_KEY);
}

const rm = (n: number) => `RM${Math.round(n).toLocaleString()}`;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
// probability/confidence may arrive as a percent (78) or a fraction (0.78).
const toUnit = (n: number) => clamp01(n > 1 ? n / 100 : n);
// risk score may arrive as a fraction (0.48) or already 0-100 (48).
const toScore100 = (n: number) =>
  Math.round(Math.min(100, Math.max(0, n <= 1 ? n * 100 : n)));

// The shared financial context passed to every agent (MASTER_SPEC §14), now
// enriched with the burn/runway baselines the agents need to compute their
// derived metrics. All numbers come from the deterministic engine.
function buildContext(state: FinancialState, health: FinancialHealth): string {
  const dailyBurn = state.monthlyOpex / 30;
  const totalReceivables = state.invoices.reduce((sum, i) => sum + i.amount, 0);

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
    `Daily operating burn: ${rm(dailyBurn)}`,
    `Baseline runway (days to cash-zero): ${health.runwayDays.toFixed(1)}`,
    `Payroll amount: ${rm(state.payrollAmount)}`,
    `Payroll due in: ${state.payrollDueInDays} days`,
    `Expected collections: ${rm(health.expectedCollections)}`,
    `Operating burn before payroll: ${rm(health.operatingBurnToPayroll)}`,
    `Projected cash before payroll: ${rm(health.projectedCashBeforePayroll)}`,
    `Payroll gap: ${rm(health.payrollGap)}`,
    `Payroll risk: ${health.payrollRisk ? "YES" : "NO"}`,
    `Total outstanding receivables: ${rm(totalReceivables)}`,
    `Outstanding invoices:`,
    invoices,
  ].join("\n");
}

// Every agent must return exactly this expanded analytical schema.
const SCHEMA_INSTRUCTION = `Respond with a SINGLE valid JSON object and nothing else. Use exactly this schema:
{
  "agent": "string",
  "headline": "string",
  "position": "string",
  "recommendedAction": "string",
  "reasoning": ["string", "string", "string"],
  "statisticalVariance": "string",
  "predictiveMetrics": { "adjustedRunwayDays": number, "probabilityOfSuccess": number },
  "quantitativeRiskScore": number,
  "confidence": number
}
Rules:
- "reasoning" must be an array of exactly three short strings.
- "statisticalVariance" is one sentence quantifying the variance/sensitivity you modelled.
- "predictiveMetrics.adjustedRunwayDays" is a number of days (one decimal place).
- "predictiveMetrics.probabilityOfSuccess" is a number between 0 and 1.
- "quantitativeRiskScore" is an integer between 0 and 100 (higher = more risk).
- "confidence" is a number between 0 and 1.
- Only reference the financial figures provided. Compute every derived metric from them; never invent raw numbers.`;

const CFO_SYSTEM = `You are the CFO of a small business speaking in a financial boardroom, operating as an elite, quantitative venture-capital analyst.
You are rigorous and numbers-first, and you prioritise survival over growth: liquidity, runway, payroll stability, and protecting cash reserves.
Perform a Macro-Economic Sensitivity analysis: calculate how a ±5% variance in operating burn changes the exact number of days of runway left before the cash-zero point. Reflect the stressed (+5% burn) figure in predictiveMetrics.adjustedRunwayDays, describe the ±5% runway band in statisticalVariance, and set probabilityOfSuccess to the likelihood the business covers payroll before cash-zero.
${SCHEMA_INSTRUCTION}
Set "agent" to "CFO".`;

const COLLECTIONS_SYSTEM = `You are the Collections Manager of a small business speaking in a financial boardroom immediately after the CFO, operating as an expert Risk Operations Analyst.
You are practical, client-aware, and focused on recovering outstanding receivables and improving cash inflow.
You have just received the CFO's structured output. Acknowledge the CFO's liquidity stance in your "position", then compute an explicit Probability-Weighted Receivables Vector across the overdue invoices — in particular Client Alpha's settlement probability under standard industry default matrices. Reflect the recovered-cash runway in predictiveMetrics.adjustedRunwayDays, the weighted collection likelihood in predictiveMetrics.probabilityOfSuccess, and the receivables variance in statisticalVariance.
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
      max_tokens: 900,
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

// Coerce a parsed model object into a strict AgentResponse, or throw.
function normalizeAgent(
  obj: Record<string, unknown>,
  agent: AgentResponse["agent"]
): AgentResponse {
  const reasoning = Array.isArray(obj.reasoning)
    ? obj.reasoning.map((r) => String(r)).filter((r) => r.trim() !== "")
    : [];

  const pm =
    obj.predictiveMetrics && typeof obj.predictiveMetrics === "object"
      ? (obj.predictiveMetrics as Record<string, unknown>)
      : {};
  const adjustedRunwayDays = Number(pm.adjustedRunwayDays);
  const probabilityOfSuccess = Number(pm.probabilityOfSuccess);
  const quantitativeRiskScore = Number(obj.quantitativeRiskScore);
  const statisticalVariance =
    typeof obj.statisticalVariance === "string"
      ? obj.statisticalVariance.trim()
      : "";

  // Strictly demand the full expanded structure.
  if (
    !obj.headline ||
    !obj.position ||
    !obj.recommendedAction ||
    reasoning.length === 0 ||
    statisticalVariance === "" ||
    !Number.isFinite(adjustedRunwayDays) ||
    !Number.isFinite(probabilityOfSuccess) ||
    !Number.isFinite(quantitativeRiskScore)
  ) {
    throw new Error("Agent JSON is missing required analytical fields");
  }

  let confidence = Number(obj.confidence);
  if (!Number.isFinite(confidence)) confidence = 0.75;

  return {
    agent, // enforce the agent identity server-side
    role: ROLE_BY_AGENT[agent],
    headline: String(obj.headline),
    position: String(obj.position),
    recommendedAction: String(obj.recommendedAction),
    reasoning: reasoning.slice(0, 3),
    statisticalVariance,
    predictiveMetrics: {
      adjustedRunwayDays: round1(Math.max(0, adjustedRunwayDays)),
      probabilityOfSuccess: toUnit(probabilityOfSuccess),
    },
    quantitativeRiskScore: toScore100(quantitativeRiskScore),
    confidence: toUnit(confidence),
  };
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
  return normalizeAgent(obj, agent);
}

// INFERENCE 1 — the CFO's macro-economic sensitivity analysis.
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
// computes a probability-weighted receivables vector in response.
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
    "Read the CFO's stance carefully. Acknowledge their liquidity position, then compute the probability-weighted receivables vector they underweight.",
  ].join("\n");

  const content = await fireworksChat([
    { role: "system", content: COLLECTIONS_SYSTEM },
    { role: "user", content: userContent },
  ]);
  return parseAgent(content, "Collections Manager");
}
