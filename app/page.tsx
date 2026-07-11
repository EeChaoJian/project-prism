"use client";

import { useEffect, useRef, useState } from "react";
import MetricCard from "@/components/MetricCard";
import AgentCard from "@/components/AgentCard";
import DecisionCustomizer from "@/components/DecisionCustomizer";
import OptionComparison from "@/components/OptionComparison";
import ExecutiveActionPlan from "@/components/ExecutiveActionPlan";
import CountUp from "@/components/CountUp";
import CashFlowChart from "@/components/CashFlowChart";
import BoardroomStatus from "@/components/BoardroomStatus";
import OrchestrationConsole from "@/components/OrchestrationConsole";
import CompanyOnboardingForm from "@/components/CompanyOnboardingForm";
import ScenarioAnalysis from "@/components/ScenarioAnalysis";
import EmergencyBriefing from "@/components/EmergencyBriefing";
import RiskBadge from "@/components/RiskBadge";
import {
  initialFinancialState,
  type FinancialState,
} from "@/lib/financialState";
import { checkFinancialHealth } from "@/lib/healthCheck";
import { riskLevel } from "@/lib/risk";
import { useBoardroom } from "@/lib/useBoardroom";
import { BOARDROOM_STEPS, type BoardSource } from "@/lib/boardroom";
import {
  simulateDecision,
  defaultDecisionParameters,
  compareOptions,
  recommendedAction,
  type DecisionAction,
  type DecisionParameters,
  type SimulationResult,
} from "@/lib/simulation";

// Which executive backs each response, and its honest downside — surfaced in
// the result so the owner sees the full trade-off at the moment of decision.
const DECISION_META: Record<
  DecisionAction,
  { supporter: string; downside: string }
> = {
  prioritize_alpha: {
    supporter: "Daniel Reyes · Collections Manager",
    downside: "Chasing aggressively may strain the client relationship.",
  },
  delay_equipment: {
    supporter: "Maya Chen · CFO",
    downside: "Postpones the operational upgrade the equipment enables.",
  },
  early_payment_discount: {
    supporter: "Daniel Reyes · Collections Manager",
    downside: "Sacrifices margin on the discounted invoices.",
  },
  do_nothing: {
    supporter: "No executive backs inaction",
    downside: "Payroll risk remains unaddressed.",
  },
};

const safeNumber = (n: number) => (Number.isFinite(n) ? n : 0);
const rm = (n: number) => `RM${Math.round(safeNumber(n)).toLocaleString()}`;
const days = (n: number) => `${Math.round(safeNumber(n)).toLocaleString()} days`;

// Shared monochrome tokens.
const CARD =
  "bg-white rounded-2xl border border-neutral-200/80 shadow-sm transition-all duration-200";
const PRIMARY_BUTTON =
  "bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-xl px-5 py-2.5 shadow-sm transition-all active:scale-[0.98]";

type View = "briefing" | "setup" | "boardroom";

// Respect the user's reduced-motion preference for programmatic scrolls.
const scrollBehavior = (): ScrollBehavior =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";

export default function Home() {
  // ---- Centralized dashboard state ---------------------------------------
  // Today's business situation and assumptions are the single source of
  // truth: metric cards, agent context, decision options, the chart, and
  // simulateDecision() all derive from them.
  const [view, setView] = useState<View>("briefing");
  const [company, setCompany] = useState<FinancialState>(initialFinancialState);
  const [params, setParams] = useState<DecisionParameters>(() =>
    defaultDecisionParameters(initialFinancialState)
  );
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [selected, setSelected] = useState<DecisionAction | null>(null);

  // The payoff must be witnessed: when a decision is committed, bring the
  // result panel on screen. Live assumption tweaks keep `selected` stable,
  // so they never re-trigger the scroll.
  const resultRef = useRef<HTMLElement | null>(null);
  const decisionRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (selected && resultRef.current) {
      resultRef.current.scrollIntoView({
        behavior: scrollBehavior(),
        block: "start",
      });
    }
  }, [selected]);

  // The AI boardroom is generated on demand via /api/boardroom.
  const {
    status: boardStatus,
    phase,
    logs,
    board,
    activeStep,
    source,
    model,
    convene,
    reset,
  } = useBoardroom();

  const health = checkFinancialHealth(company);
  const outcomes = compareOptions(company, params);
  const recommended = recommendedAction(company, params);

  function handleProfileSubmit(next: FinancialState) {
    setCompany(next);
    setParams(defaultDecisionParameters(next));
    setResult(null);
    setSelected(null);
    reset(); // never show a stale board against fresh financial data
    setView("boardroom");
    void convene(next);
  }

  function handleEnterBoardroom() {
    setResult(null);
    setSelected(null);
    reset();
    setView("boardroom");
    void convene(company);
  }

  function handleDecide(action: DecisionAction) {
    setSelected(action);
    setResult(simulateDecision(company, action, params));
  }

  function handleParamsChange(next: DecisionParameters) {
    setParams(next);
    // Re-run the active simulation live so the result panel tracks the inputs.
    if (selected) setResult(simulateDecision(company, selected, next));
  }

  const after = result?.after ?? null;
  const simulatedState = result?.updatedState ?? null;

  // ---- Briefing view (landing) -------------------------------------------
  if (view === "briefing") {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <EmergencyBriefing
          company={company}
          health={health}
          onEnter={handleEnterBoardroom}
          onEdit={() => setView("setup")}
        />
      </main>
    );
  }

  // ---- Setup view ---------------------------------------------------------
  if (view === "setup") {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <header className="mb-8">
          <div className="text-4xl font-semibold text-neutral-900" aria-hidden>
            !
          </div>
          <div className="mt-3 text-sm font-medium text-neutral-500">
            Payroll Risk Detected
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-900">
            {health.payrollRisk
              ? `Payroll may fail in ${company.payrollDueInDays} days.`
              : "Prepare the board before payroll is due."}
          </h1>
          <p className="mt-3 max-w-2xl font-normal text-neutral-500">
            Before we convene the emergency board meeting, review the sample
            business below. Edit anything you&apos;d like.
          </p>
        </header>

        <CompanyOnboardingForm initial={company} onSubmit={handleProfileSubmit} />
      </main>
    );
  }

  // ---- Boardroom view -----------------------------------------------------
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      {/* Executive hero */}
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-neutral-500">
            {health.payrollRisk ? "Payroll Risk Detected" : "Cash Position Stable"}
          </span>
          <RiskBadge level={riskLevel(company, health)} />
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-900">
          The board is in session.
        </h1>
        <p className="mt-3 max-w-2xl font-normal text-neutral-500">
          {health.payrollRisk
            ? `Projected cash falls ${rm(health.payrollGap)} short of the ${rm(
                company.payrollAmount
              )} payroll due in ${
                company.payrollDueInDays
              } days. Your executives are reviewing the options now.`
            : `No payroll risk detected for ${company.companyName}. The board will pressure-test the position before you commit.`}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
          <span>
            Business:{" "}
            <span className="font-medium text-neutral-900">
              {company.companyName}
            </span>
          </span>
          <button
            onClick={() => setView("setup")}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-300"
          >
            Edit Today&apos;s Situation
          </button>
        </div>
      </header>

      {/* Dashboard metrics */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Payroll Risk"
          value={health.payrollRisk ? "At Risk" : "Covered"}
          sublabel={`Gap: ${rm(health.payrollGap)}`}
          afterValue={
            after ? (after.payrollRisk ? "At Risk" : "Covered") : undefined
          }
          improved={after ? !after.payrollRisk && health.payrollRisk : false}
          featured={health.payrollRisk}
        />
        <MetricCard
          label="Cash Balance"
          value={rm(company.cashBalance)}
          sublabel="Cash on hand today"
          afterValue={simulatedState ? rm(simulatedState.cashBalance) : undefined}
          improved={
            simulatedState
              ? simulatedState.cashBalance > company.cashBalance
              : false
          }
        />
        <MetricCard
          label="Runway Days"
          value={days(health.runwayDays)}
          sublabel="At current burn rate"
          afterValue={after ? days(after.runwayDays) : undefined}
          improved={after ? after.runwayDays > health.runwayDays : false}
        />
        <MetricCard
          label="Expected Collections"
          value={rm(health.expectedCollections)}
          sublabel={`${company.invoices.length} outstanding invoices`}
          afterValue={after ? rm(after.expectedCollections) : undefined}
        />
      </section>

      {/* Agent boardroom */}
      <section className="mb-12">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
              The Boardroom
            </h2>
            <p className="max-w-xl text-sm text-neutral-500">
              The CFO protects payroll first. The Collections Manager pushes
              back from the receivables side. Then the owner decides.
            </p>
          </div>
          <button
            onClick={() => convene(company)}
            disabled={boardStatus === "running"}
            className={`shrink-0 ${PRIMARY_BUTTON} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {boardStatus === "idle"
              ? "Convene Boardroom"
              : boardStatus === "running"
                ? "Convening…"
                : "Re-convene Boardroom"}
          </button>
        </div>

        {boardStatus === "idle" && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
            Click{" "}
            <span className="font-medium text-neutral-900">
              Convene Boardroom
            </span>{" "}
            to generate the CFO and Collections Manager analysis for{" "}
            {company.companyName}&apos;s situation today.
          </div>
        )}

        {boardStatus !== "idle" && (
          <div className="space-y-4">
            {/* Live boardroom thinking trace. */}
            <OrchestrationConsole
              logs={logs}
              phase={phase}
              active={boardStatus === "running"}
            />

            {/* Compact two-step indicator while streaming. */}
            {boardStatus === "running" && (
              <BoardroomStatus
                steps={BOARDROOM_STEPS}
                activeStep={activeStep}
                doneCount={board.length}
              />
            )}

            {/* Provenance of the final result. */}
            {boardStatus === "done" && (
              <SourceBadge source={source} model={model} />
            )}

            {/* Agent cards — revealed progressively as they arrive. */}
            {board.length > 0 && (
              <div className="mx-auto max-w-3xl space-y-3">
                {board.map((agent, index) => (
                  <div key={agent.agent}>
                    <AgentCard agent={agent} />
                    {index === 0 && board.length > 1 && (
                      <div className="flex flex-col items-center py-2">
                        <div className="text-lg text-neutral-300" aria-hidden>
                          ↓
                        </div>
                        <div className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-700 shadow-sm">
                          The board is split — Collections Manager pushes back.
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Handoff to the owner. */}
            {boardStatus === "done" && board.length > 1 && (
              <p className="pt-1 text-center text-sm font-medium text-neutral-900">
                The board has weighed in. The final decision is yours.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Owner decision — one surface: the comparison table commits the choice */}
      <section ref={decisionRef} className="mb-12 scroll-mt-6">
        <div className="mb-5">
          <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
            Your Decision
          </h2>
          <p className="text-sm text-neutral-500">
            Every option, simulated. Pick one — the numbers update instantly.
            The AI never invents these numbers.
          </p>
        </div>
        <div className="space-y-3">
          <OptionComparison
            outcomes={outcomes}
            recommended={recommended}
            selected={selected}
            onSelect={handleDecide}
          />
          <details className="group">
            <summary className="flex w-fit cursor-pointer list-none items-center gap-2 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900">
              <span
                className="text-neutral-400 transition-transform group-open:rotate-90"
                aria-hidden
              >
                ›
              </span>
              Adjust assumptions
            </summary>
            <div className="mt-3">
              <DecisionCustomizer
                state={company}
                params={params}
                onChange={handleParamsChange}
              />
            </div>
          </details>
        </div>
      </section>

      {/* Risk layer — the distribution around the deterministic estimate,
          computed live for the current business (mirrored at scale on AMD). */}
      <ScenarioAnalysis company={company} params={params} selected={selected} />

      {/* Simulation result */}
      {result && (
        <section
          ref={resultRef}
          key={result.action}
          className={`mb-12 scroll-mt-6 p-6 ${CARD} animate-[rise_0.4s_ease-out]`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-neutral-500">
              Board Decision Executed
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
              ✓ Deterministic simulation complete
            </span>
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
            {result.label}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-neutral-500">
            {result.explanation}
          </p>

          {/* The payoff — projected cash at payday visibly moves to its new
              position. This is the number that decides payroll (and the one an
              action like delaying capex actually changes; cash-on-hand may not). */}
          <div className="mt-5 flex flex-wrap items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
              <CountUp
                value={result.after.projectedCashBeforePayroll}
                from={result.before.projectedCashBeforePayroll}
                prefix="RM"
              />
            </span>
            <span className="text-sm text-neutral-500">
              projected cash when payroll is due
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-neutral-500">
              Risk Level
            </span>
            <RiskBadge level={riskLevel(company, result.before)} />
            <span className="text-neutral-400" aria-hidden>
              →
            </span>
            <RiskBadge level={riskLevel(result.updatedState, result.after)} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <ComparisonRow
              label="Payroll Status"
              before={result.before.payrollRisk ? "Exposed" : "Protected"}
              after={result.after.payrollRisk ? "Exposed" : "Protected"}
              improved={!result.after.payrollRisk && result.before.payrollRisk}
            />
            <ComparisonRow
              label="Cash Balance"
              before={rm(company.cashBalance)}
              after={rm(result.updatedState.cashBalance)}
              improved={result.updatedState.cashBalance > company.cashBalance}
            />
            <ComparisonRow
              label="Runway"
              before={days(result.before.runwayDays)}
              after={days(result.after.runwayDays)}
              improved={result.after.runwayDays > result.before.runwayDays}
            />
          </div>

          {/* Decision clarity — who backed it, and the honest downside. */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="text-xs uppercase tracking-wider text-neutral-500">
                Supported by
              </div>
              <div className="mt-1 text-sm font-medium text-neutral-900">
                {DECISION_META[result.action].supporter}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="text-xs uppercase tracking-wider text-neutral-500">
                Downside
              </div>
              <div className="mt-1 text-sm text-neutral-600">
                {DECISION_META[result.action].downside}
              </div>
            </div>
          </div>

          {/* Resolution beat — the outcome, stated from the real deltas. */}
          <div className="mt-6 rounded-xl bg-neutral-900 p-4 text-sm font-medium text-white">
            <div className="text-xs uppercase tracking-widest text-white/50">
              Board Decision Implemented
            </div>
            <div className="mt-1">{boardOutcome(company.cashBalance, result)}</div>
            <button
              onClick={() => {
                setResult(null);
                setSelected(null);
                decisionRef.current?.scrollIntoView({
                  behavior: scrollBehavior(),
                  block: "start",
                });
              }}
              className="mt-3 text-xs font-semibold text-white/70 transition-colors hover:text-white"
            >
              Try a different decision ↺
            </button>
          </div>
        </section>
      )}

      {result && (
        <ExecutiveActionPlan company={company} result={result} board={board} />
      )}

      {/* Cash projection chart */}
      <section className="mb-12">
        <CashFlowChart current={company} simulated={simulatedState} />
      </section>

      <footer className="border-t border-neutral-200 pt-6 text-xs text-neutral-400">
        Project Prism · The math is deterministic. The debate is AI. The
        decision is yours.
      </footer>
    </main>
  );
}

// The resolution line — honest about whether the crunch was actually solved.
function boardOutcome(companyCash: number, result: SimulationResult): string {
  const cashUp = result.updatedState.cashBalance - companyCash;
  const runwayUp = Math.round(result.after.runwayDays - result.before.runwayDays);
  if (result.action === "do_nothing") {
    return "No action taken — payroll risk remains and the board is still exposed.";
  }
  if (!result.after.payrollRisk && result.before.payrollRisk) {
    const buffer = Math.round(-result.after.payrollGap);
    return `Payroll protected — projected cash now clears payroll${
      buffer > 0 ? ` with RM${buffer.toLocaleString()} to spare` : ""
    }.`;
  }
  if (result.action === "delay_equipment") {
    return `Scheduled equipment outflow delayed · payroll gap now RM${Math.round(
      result.after.payrollGap
    ).toLocaleString()} — narrowed, still exposed.`;
  }
  return `Cash up RM${Math.round(
    cashUp
  ).toLocaleString()} · runway +${runwayUp} days · payroll gap now RM${Math.round(
    result.after.payrollGap
  ).toLocaleString()} — narrowed, still exposed.`;
}

function SourceBadge({
  source,
  model,
}: {
  source: BoardSource | null;
  model: string | null;
}) {
  const config: Record<BoardSource, { dot: string; label: (model: string | null) => string }> = {
    fireworks: {
      dot: "bg-neutral-900",
      label: (model) => `Generated live by Fireworks AI · ${model ?? "configured model"}`,
    },
    "partial-fallback": {
      dot: "bg-neutral-400",
      label: (model) =>
        `One executive live via Fireworks AI · ${
          model ?? "configured model"
        }, one offline — numbers unaffected`,
    },
    fallback: {
      dot: "bg-neutral-400",
      label: () => "Boardroom in offline mode — same numbers, same decision engine",
    },
  };
  const c = source ? config[source] : config.fallback;

  return (
    <div className="flex items-center gap-2 text-xs text-neutral-500">
      <span className={`inline-block h-2 w-2 rounded-full ${c.dot}`} />
      <span>{c.label(model)}</span>
    </div>
  );
}

function ComparisonRow({
  label,
  before,
  after,
  improved,
}: {
  label: string;
  before: string;
  after: string;
  improved: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm">
        <span className="text-neutral-400 line-through decoration-neutral-300">
          {before}
        </span>
        <span className="text-neutral-400">→</span>
        <span className="font-semibold tracking-tight text-neutral-900">
          {improved ? "↑ " : ""}
          {after}
        </span>
      </div>
    </div>
  );
}
