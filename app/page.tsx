"use client";

import { useState } from "react";
import MetricCard from "@/components/MetricCard";
import AgentCard from "@/components/AgentCard";
import DecisionPanel from "@/components/DecisionPanel";
import DecisionCustomizer from "@/components/DecisionCustomizer";
import CashFlowChart from "@/components/CashFlowChart";
import BoardroomStatus from "@/components/BoardroomStatus";
import OrchestrationConsole from "@/components/OrchestrationConsole";
import CompanyOnboardingForm from "@/components/CompanyOnboardingForm";
import {
  initialFinancialState,
  type FinancialState,
} from "@/lib/financialState";
import { checkFinancialHealth } from "@/lib/healthCheck";
import { useBoardroom } from "@/lib/useBoardroom";
import { BOARDROOM_STEPS, type BoardSource } from "@/lib/boardroom";
import {
  simulateDecision,
  getDecisionOptions,
  defaultDecisionParameters,
  type DecisionAction,
  type DecisionParameters,
  type SimulationResult,
} from "@/lib/simulation";

const safeNumber = (n: number) => (Number.isFinite(n) ? n : 0);
const rm = (n: number) => `RM${Math.round(safeNumber(n)).toLocaleString()}`;
const days = (n: number) => `${Math.round(safeNumber(n)).toLocaleString()} days`;

// Shared monochrome tokens.
const CARD =
  "bg-white rounded-2xl border border-neutral-200/80 shadow-sm transition-all duration-200";
const PRIMARY_BUTTON =
  "bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-xl px-5 py-2.5 transition-colors shadow-sm";

type View = "setup" | "boardroom";

export default function Home() {
  // ---- Centralized dashboard state ---------------------------------------
  // The company profile and decision parameters are the single source of
  // truth: metric cards, agent context, decision options, the chart, and
  // simulateDecision() all derive from them.
  const [view, setView] = useState<View>("setup");
  const [company, setCompany] = useState<FinancialState>(initialFinancialState);
  const [params, setParams] = useState<DecisionParameters>(() =>
    defaultDecisionParameters(initialFinancialState)
  );
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [selected, setSelected] = useState<DecisionAction | null>(null);

  // The AI boardroom is generated on demand via /api/boardroom.
  const {
    status: boardStatus,
    phase,
    logs,
    board,
    activeStep,
    source,
    convene,
    reset,
  } = useBoardroom();

  const health = checkFinancialHealth(company);
  const options = getDecisionOptions(company, params);

  function handleProfileSubmit(next: FinancialState) {
    setCompany(next);
    setParams(defaultDecisionParameters(next));
    setResult(null);
    setSelected(null);
    reset(); // never show a stale board against fresh financial data
    setView("boardroom");
    void convene(next);
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

  // ---- Setup view ---------------------------------------------------------
  if (view === "setup") {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
            <span className="inline-block h-2 w-2 rounded-full bg-neutral-900" />
            Emergency Board Meeting
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-900">
            {health.payrollRisk
              ? `Payroll may fail in ${company.payrollDueInDays} days. The boardroom has been called.`
              : "Prepare the board before payroll is due."}
          </h1>
          <p className="mt-3 max-w-2xl font-normal text-neutral-500">
            Let&apos;s understand your business before we convene the board.
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
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
          <span className="inline-block h-2 w-2 rounded-full bg-neutral-900" />
          Emergency Board Meeting
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-900">
          Payroll may fail in {company.payrollDueInDays} days. The boardroom has
          been called.
        </h1>
        <p className="mt-3 max-w-2xl font-normal text-neutral-500">
          Project Prism stress-tests the choices in front of the owner. The
          numbers come from the simulation; the agents explain the trade-offs.
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
            Edit Business Details
          </button>
        </div>
      </header>

      {/* Executive Crisis Command — computed directly from checkFinancialHealth */}
      {health.payrollRisk ? (
        <section className="mb-12 rounded-2xl bg-neutral-900 p-6 text-white shadow-md sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-white/70">
                Emergency Board Meeting Required
              </div>
              <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
                Payroll may fail in {company.payrollDueInDays} days.
              </p>
              <p className="mt-2 text-sm text-neutral-300">
                The boardroom has been called. Review the cash-flow stress test
                before choosing what to do next.
              </p>
            </div>
            <button
              onClick={() => convene(company)}
              disabled={boardStatus === "running"}
              className="shrink-0 rounded-xl bg-white px-5 py-2.5 font-medium text-neutral-900 shadow-sm transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {boardStatus === "idle"
                ? "Convene Boardroom"
                : boardStatus === "running"
                  ? "Convening…"
                  : "Re-convene Boardroom"}
            </button>
          </div>
        </section>
      ) : (
        <section className={`mb-12 p-6 sm:p-7 ${CARD}`}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                Cash Position Stable
              </div>
              <p className="mt-2 text-lg font-semibold tracking-tight text-neutral-900 sm:text-xl">
                No payroll risk detected for {company.companyName}.
              </p>
              <p className="mt-2 text-sm text-neutral-500">{health.alertMessage}</p>
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
        </section>
      )}

      {/* Dashboard metrics */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <MetricCard
          label="Payroll Risk"
          value={health.payrollRisk ? "At Risk" : "Covered"}
          sublabel={`Gap: ${rm(health.payrollGap)}`}
          afterValue={
            after ? (after.payrollRisk ? "At Risk" : "Covered") : undefined
          }
          improved={after ? !after.payrollRisk && health.payrollRisk : false}
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
          {/* The primary Convene CTA lives in the crisis command above; here we
              only surface the in-context control once a run has started. */}
          {boardStatus !== "idle" && (
            <button
              onClick={() => convene(company)}
              disabled={boardStatus === "running"}
              className={`shrink-0 ${PRIMARY_BUTTON} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {boardStatus === "running"
                ? "Convening…"
                : "Re-convene Boardroom"}
            </button>
          )}
        </div>

        {boardStatus === "idle" && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
            Click{" "}
            <span className="font-medium text-neutral-900">
              Convene Boardroom
            </span>{" "}
            to generate the CFO and Collections Manager analysis for{" "}
            {company.companyName}&apos;s current financial state.
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
            {boardStatus === "done" && <SourceBadge source={source} />}

            {/* Agent cards — revealed progressively as they arrive. */}
            {board.length > 0 && (
              <div className="mx-auto max-w-3xl space-y-3">
                {board.map((agent, index) => (
                  <div key={agent.agent}>
                    <AgentCard agent={agent} />
                    {index === 0 && board.length > 1 && (
                      <div
                        className="flex justify-center py-1 text-lg text-neutral-300"
                        aria-hidden
                      >
                        ↓
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Owner decision */}
      <section className="mb-12">
        <div className="mb-5">
          <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
            Your Decision
          </h2>
          <p className="text-sm text-neutral-500">
            Choose your assumptions, then choose a response. The simulation
            updates the numbers immediately — the AI never invents the outcome.
          </p>
        </div>
        <div className="space-y-4">
          <DecisionCustomizer
            state={company}
            params={params}
            onChange={handleParamsChange}
          />
          <DecisionPanel
            options={options}
            onDecide={handleDecide}
            selected={selected}
          />
        </div>
      </section>

      {/* Simulation result */}
      {result && (
        <section className={`mb-12 p-6 ${CARD}`}>
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            Simulated Decision
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
            {result.label}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-neutral-500">
            {result.explanation}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
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
            <ComparisonRow
              label="Payroll Risk"
              before={result.before.payrollRisk ? "At Risk" : "Covered"}
              after={result.after.payrollRisk ? "At Risk" : "Covered"}
              improved={!result.after.payrollRisk && result.before.payrollRisk}
            />
          </div>
        </section>
      )}

      {/* Cash projection chart */}
      <section className="mb-12">
        <CashFlowChart current={company} simulated={simulatedState} />
      </section>

      <footer className="border-t border-neutral-200 pt-6 text-xs text-neutral-400">
        Project Prism · AI Boardroom MVP · Numbers from simulation, reasoning
        from AI.
      </footer>
    </main>
  );
}

function SourceBadge({ source }: { source: BoardSource | null }) {
  const config: Record<BoardSource, { dot: string; label: string }> = {
    fireworks: {
      dot: "bg-neutral-900",
      label: "Generated live by Fireworks AI · Llama 3.1 70B",
    },
    "partial-fallback": {
      dot: "bg-neutral-400",
      label: "Partial: one agent live, one static fallback",
    },
    fallback: {
      dot: "bg-neutral-400",
      label:
        "Offline fallback — static boardroom (set FIREWORKS_API_KEY for live AI)",
    },
  };
  const c = source ? config[source] : config.fallback;

  return (
    <div className="flex items-center gap-2 text-xs text-neutral-500">
      <span className={`inline-block h-2 w-2 rounded-full ${c.dot}`} />
      <span>{c.label}</span>
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
