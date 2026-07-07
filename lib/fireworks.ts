// Fireworks AI orchestration for the boardroom.
//
// This module is server-only (it reads FIREWORKS_API_KEY and calls the
// Fireworks inference API). It runs two SEQUENTIAL inferences:
//   1. The CFO models payroll liquidity and operating-burn sensitivity.
//   2. The Collections Manager reads the CFO's literal output and counters
//      with receivables recovery assumptions.
//
// Every function here THROWS on any failure (missing key, HTTP error, bad
// JSON, missing fields). The API route catches those and falls back to the
// static mock boardroom in lib/agents.ts, so the demo never breaks.

import { lookalikeCohortData, type FinancialState } from "./financialState";
import type { FinancialHealth } from "./healthCheck";
import { payrollCoverageConfidence, type AgentResponse } from "./agents";

export const FIREWORKS_MODEL =
  process.env.FIREWORKS_MODEL ??
  "accounts/fireworks/models/llama-v3p1-70b-instruct";

const FIREWORKS_URL =
  "https://api.fireworks.ai/inference/v1/chat/completions";

// The two agents whose responses we generate, and the role blurb the UI shows.
const ROLE_BY_AGENT: Record<AgentResponse["agent"], string> = {
  CFO: "Liquidity, payroll, and runway.",
  "Collections Manager":
    "Receivables and overdue invoices.",
};

export function hasFireworksKey(): boolean {
  return Boolean(process.env.FIREWORKS_API_KEY);
}

const rm = (n: number) => `RM${Math.round(n).toLocaleString()}`;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
// Confidence values may arrive as a percent (78) or a fraction (0.78).
const toUnit = (n: number) => clamp01(n > 1 ? n / 100 : n);

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

// Synthetic demo benchmark data. It gives the agents a concrete comparison
// point for the hackathon demo, without claiming to be live or verified market
// data. Values come from lib/financialState so prompts and stream logs stay in
// sync. Amounts are interpolated from the live financial state so custom
// company profiles stay coherent.
const cohort = lookalikeCohortData;
const pctOf = (n: number) => `${Math.round(n * 100)}%`;

const cohortCfoNote = (state: FinancialState) =>
  `Use the synthetic demo benchmark cohort ${cohort.cohortId} (n=${cohort.sampleSize}, ${cohort.industry}) as illustrative context only. In this demo benchmark, delaying capital expenditure to preserve ${rm(
    state.equipmentPurchase
  )} protected near-term payroll coverage in ${pctOf(
    cohort.historicalOutcomes.delayEquipmentSuccessRate
  )} of cases, compared with a no-action default benchmark of ${pctOf(
    cohort.historicalOutcomes.defaultRateIfNoAction
  )}. Label this as synthetic demo benchmark data if you cite it.`;

// The receivable the Collections Manager is instructed to champion — the
// largest outstanding invoice in whatever state was supplied.
function primaryReceivable(state: FinancialState) {
  return state.invoices.reduce<
    FinancialState["invoices"][number] | undefined
  >((top, inv) => (!top || inv.amount > top.amount ? inv : top), undefined);
}

const COHORT_COLLECTIONS = `Use the synthetic demo benchmark cohort ${cohort.cohortId} (n=${cohort.sampleSize}) as illustrative context only: early-settlement discounting accelerates invoice realization by an average of ${cohort.historicalOutcomes.discountInflowAccelerationDays} days in this demo benchmark. Label it as synthetic demo benchmark data if you cite it.`;

// Every agent must return exactly the fields shown in the boardroom cards.
const SCHEMA_INSTRUCTION = `Respond with a SINGLE valid JSON object and nothing else. Use exactly this schema:
{
  "headline": "string",
  "recommendation": "string",
  "reasoning": ["string", "string", "string"],
  "risk": "string",
  "scenarioConfidence": number
}
Rules:
- "recommendation" must be one plain-spoken sentence.
- "reasoning" must be exactly three short strings.
- "risk" must be one concise primary risk.
- "scenarioConfidence" is a number between 0 and 1.
- Only reference the financial figures provided. Compute every derived metric from them; never invent raw numbers.`;

const cfoSystem = (state: FinancialState) =>
  `You are the CFO of a small business, speaking in a live financial boardroom. Be conservative and plain-spoken: your mandate is to protect payroll.
Your recommendation is to "Delay Equipment Purchase". Argue that cutting a scheduled cash outflow is the clearest way to protect payroll, and that relying on overdue balances adds timing risk.
Set scenarioConfidence to ${payrollCoverageConfidence(
    state,
    "delay_equipment"
  ).toFixed(2)}. This is the deterministic confidence that your recommendation protects payroll.
${cohortCfoNote(state)}
Write short, natural sentences fit for an urgent 3-minute board overview.
${SCHEMA_INSTRUCTION}`;

const collectionsSystem = (state: FinancialState) => {
  const target = primaryReceivable(state);
  if (!target) {
    return `You are the Collections Manager of a small business, speaking in a live financial boardroom immediately after the CFO.
There are no outstanding invoices. Do not invent a receivables recovery path.
Your recommendation must state that collections cannot solve this scenario.
Set scenarioConfidence to 0.
Write short, natural sentences fit for an urgent 3-minute board overview.
${SCHEMA_INSTRUCTION}`;
  }
  const targetName = target?.client ?? "the largest overdue account";
  const targetPct = Math.round((target?.collectionProbability ?? 0) * 100);
  const targetAmount = rm(target?.amount ?? 0);
  return `You are the Collections Manager of a small business, speaking in a live financial boardroom immediately after the CFO. Push back on the CFO's conservative posture.
Your recommendation is to "Prioritize ${targetName}". Argue that freezing the equipment purchase may slow operations. Counter using receivables recovery assumptions: ${targetName} carries ${targetPct}% settlement confidence on their ${targetAmount} outstanding balance.
You have just received the CFO's structured output. Begin your recommendation with "I disagree." Make a concise counter-case from the receivables angle.
Set scenarioConfidence to ${payrollCoverageConfidence(
    state,
    "prioritize_alpha"
  ).toFixed(2)}. This is the deterministic confidence that your recommendation protects payroll.
${COHORT_COLLECTIONS}
Write short, natural sentences fit for an urgent 3-minute board overview.
${SCHEMA_INSTRUCTION}`;
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
  agent: AgentResponse["agent"],
  deterministicConfidence: number
): AgentResponse {
  const reasoning = Array.isArray(obj.reasoning)
    ? obj.reasoning.map((r) => String(r)).filter((r) => r.trim() !== "")
    : [];

  const recommendation =
    typeof obj.recommendation === "string"
      ? obj.recommendation.trim()
      : "";
  const risk = typeof obj.risk === "string" ? obj.risk.trim() : "";

  // Strictly demand only the structure the UI actually displays.
  if (
    !obj.headline ||
    recommendation === "" ||
    reasoning.length !== 3 ||
    risk === ""
  ) {
    throw new Error("Agent JSON is missing required boardroom fields");
  }

  return {
    agent, // enforce the agent identity server-side
    role: ROLE_BY_AGENT[agent],
    headline: String(obj.headline),
    recommendation,
    reasoning: reasoning.slice(0, 3),
    risk,
    scenarioConfidence: toUnit(deterministicConfidence),
  };
}

// Parse + validate a model response into a strict AgentResponse, or throw.
function parseAgent(
  content: string,
  agent: AgentResponse["agent"],
  deterministicConfidence: number
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
  return normalizeAgent(obj, agent, deterministicConfidence);
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
  return parseAgent(
    content,
    "CFO",
    payrollCoverageConfidence(state, "delay_equipment")
  );
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
    "The CFO has already delivered this recommendation:",
    JSON.stringify(cfo, null, 2),
    "",
    target
      ? `Read the CFO's stance carefully. Push back with the receivables recovery assumption they underweight: chasing ${target.client} instead of freezing the equipment spend.`
      : "Read the CFO's stance carefully. There are no outstanding invoices, so do not invent a collections recovery path.",
  ].join("\n");

  const content = await fireworksChat([
    { role: "system", content: collectionsSystem(state) },
    { role: "user", content: userContent },
  ]);
  return parseAgent(
    content,
    "Collections Manager",
    target ? payrollCoverageConfidence(state, "prioritize_alpha") : 0
  );
}
