// Fireworks AI orchestration for the boardroom.
//
// This module is server-only (it reads FIREWORKS_API_KEY and calls the
// Fireworks inference API). It runs two SEQUENTIAL inferences:
//   1. The CFO — a Strategic Financial Officer — models operating burn
//      sensitivity of runway to a ±5% operating-burn variance.
//   2. The Collections Manager — a Risk Operations Manager — reads the CFO's
//      literal output and counters with receivables recovery assumptions.
//
// Every function here THROWS on any failure (missing key, HTTP error, bad
// JSON, missing fields). The API route catches those and falls back to the
// static mock boardroom in lib/agents.ts, so the demo never breaks.

import { lookalikeCohortData, type FinancialState } from "./financialState";
import type { FinancialHealth } from "./healthCheck";
import type { AgentResponse } from "./agents";

export const FIREWORKS_MODEL =
  process.env.FIREWORKS_MODEL ??
  "accounts/fireworks/models/llama-v3p1-70b-instruct";

const FIREWORKS_URL =
  "https://api.fireworks.ai/inference/v1/chat/completions";

// The two agents whose responses we generate, and the role blurb the UI shows.
const ROLE_BY_AGENT: Record<AgentResponse["agent"], string> = {
  CFO: "Strategic Financial Officer — corporate liquidity, runway constraints, and operating burn sensitivity.",
  "Collections Manager":
    "Risk Operations Manager — receivables recovery assumptions and collection aging models.",
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

// Lookalike Cohort Analysis — grounds the debate in empirical "twin" outcomes
// rather than pure speculation. Values come from lib/financialState so the
// prompts and the streamed trace logs stay in sync. Amounts are interpolated
// from the live financial state so custom company profiles stay coherent.
const cohort = lookalikeCohortData;
const pctOf = (n: number) => `${Math.round(n * 100)}%`;

const cohortCfoNote = (state: FinancialState) =>
  `Anchor your trade-off analysis on the matched lookalike cohort ${cohort.cohortId} (n=${cohort.sampleSize}, ${cohort.industry}). In this matched cohort of ${cohort.sampleSize} peers, delaying capital expenditure to preserve ${rm(
    state.equipmentPurchase
  )} protected near-term payroll compliance in ${pctOf(
    cohort.historicalOutcomes.delayEquipmentSuccessRate
  )} of cases, preventing an average default rate of ${pctOf(
    cohort.historicalOutcomes.defaultRateIfNoAction
  )}. Cite this empirical precedent explicitly in your reasoning.`;

// The receivable the Collections Manager is instructed to champion — the
// largest outstanding invoice in whatever state was supplied.
function primaryReceivable(state: FinancialState) {
  return state.invoices.reduce<
    FinancialState["invoices"][number] | undefined
  >((top, inv) => (!top || inv.amount > top.amount ? inv : top), undefined);
}

const COHORT_COLLECTIONS = `Reference the matched lookalike cohort ${cohort.cohortId} (n=${cohort.sampleSize}): historical precedents demonstrate that early-settlement discounting accelerates invoice realization by an average of ${cohort.historicalOutcomes.discountInflowAccelerationDays} days. Ground your counter-strategy in this precedent.`;

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

const cfoSystem = (state: FinancialState) =>
  `You are the Strategic Financial Officer of a small business, speaking in a live financial boardroom. Adopt a highly conservative, risk-averse institutional posture: your mandate is absolute capital preservation.
Your recommendation is to "Delay Equipment Purchase". Argue that cutting a scheduled cash outflow is the only deterministic way to secure payroll, and that relying on uncollected balances from accounts with high relationship risk is irresponsible.
Perform an operating burn sensitivity analysis: calculate how a ±5% variance in operating burn changes the exact number of days of runway left before the cash-zero point. Put the stressed (+5% burn) figure in predictiveMetrics.adjustedRunwayDays, the ±5% runway band in statisticalVariance, and the likelihood of covering payroll before cash-zero in probabilityOfSuccess.
${cohortCfoNote(state)}
Write in short, natural, hard-hitting executive sentences fit for an immediate 3-minute board overview.
${SCHEMA_INSTRUCTION}
Set "agent" to "CFO".`;

const collectionsSystem = (state: FinancialState) => {
  const target = primaryReceivable(state);
  const targetName = target?.client ?? "the largest overdue account";
  const targetPct = Math.round((target?.collectionProbability ?? 0) * 100);
  const targetAmount = rm(target?.amount ?? 0);
  return `You are the Risk Operations Manager of a small business, speaking in a live financial boardroom immediately after the CFO. Actively push back on the CFO's conservative posture.
Your recommendation is to "Prioritize ${targetName}". Argue that freezing the equipment purchase chokes operational expansion for a full month. Counter using receivables recovery assumptions: ${targetName} carries an ${targetPct}% scenario confidence on their ${targetAmount} outstanding balance, a reliable influx that solves the crisis without freezing internal progress.
You have just received the CFO's structured output. Acknowledge their liquidity stance in your "position", then make your counter-case. Assess the overdue invoices under a standard age-of-receivables aging model. Put the recovered-cash runway in predictiveMetrics.adjustedRunwayDays, the weighted collection likelihood in predictiveMetrics.probabilityOfSuccess, and the receivables variance in statisticalVariance.
${COHORT_COLLECTIONS}
Write in short, natural, hard-hitting executive sentences fit for an immediate 3-minute board overview.
${SCHEMA_INSTRUCTION}
Set "agent" to "Collections Manager".`;
};

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

// INFERENCE 1 — the CFO's operating burn sensitivity analysis.
export async function runCFO(
  state: FinancialState,
  health: FinancialHealth
): Promise<AgentResponse> {
  const content = await fireworksChat([
    { role: "system", content: cfoSystem(state) },
    { role: "user", content: buildContext(state, health) },
  ]);
  return parseAgent(content, "CFO");
}

// INFERENCE 2 — the Collections Manager reads the CFO's literal output and
// counters with receivables recovery assumptions in response.
export async function runCollections(
  state: FinancialState,
  health: FinancialHealth,
  cfo: AgentResponse
): Promise<AgentResponse> {
  const target = primaryReceivable(state);
  const userContent = [
    buildContext(state, health),
    "",
    "The CFO has already delivered this position (their verbatim JSON output):",
    JSON.stringify(cfo, null, 2),
    "",
    `Read the CFO's stance carefully. Acknowledge their liquidity position, then push back with the receivables recovery assumptions they underweight — chasing ${
      target?.client ?? "the largest overdue account"
    } instead of freezing the equipment spend.`,
  ].join("\n");

  const content = await fireworksChat([
    { role: "system", content: collectionsSystem(state) },
    { role: "user", content: userContent },
  ]);
  return parseAgent(content, "Collections Manager");
}
