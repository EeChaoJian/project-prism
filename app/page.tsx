"use client";

import { useState } from "react";
import MetricCard from "@/components/MetricCard";
import AgentCard from "@/components/AgentCard";
import DecisionPanel from "@/components/DecisionPanel";
import CashFlowChart from "@/components/CashFlowChart";
import BoardroomStatus from "@/components/BoardroomStatus";
import OrchestrationConsole from "@/components/OrchestrationConsole";
import { initialFinancialState } from "@/lib/financialState";
import { checkFinancialHealth } from "@/lib/healthCheck";
import { useBoardroom } from "@/lib/useBoardroom";
import { BOARDROOM_STEPS, type BoardSource } from "@/lib/boardroom";
import {
  simulateDecision,
  type DecisionAction,
  type SimulationResult,
} from "@/lib/simulation";

const rm = (n: number) => `RM${Math.round(n).toLocaleString()}`;

export default function Home() {
  // The deterministic base state never changes; a simulation produces a
  // separate result we render alongside it as before/after.
  const state = initialFinancialState;
  const health = checkFinancialHealth(state);

  // The AI boardroom is generated on demand via /api/boardroom.
  const {
    status: boardStatus,
    phase,
    logs,
    board,
    activeStep,
    source,
    convene,
  } = useBoardroom();

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [selected, setSelected] = useState<DecisionAction | null>(null);

  function handleDecide(action: DecisionAction) {
    setSelected(action);
    setResult(simulateDecision(state, action));
  }

  const after = result?.after ?? null;
  const simulatedState = result?.updatedState ?? null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-2 text-sm font-medium text-accent">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          Project Prism
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
          Explore financial decisions before you make them.
        </h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          An AI-powered scenario simulator for SME owners. See a cash crunch
          early, weigh the trade-offs, and simulate the outcome — all backed by
          deterministic financial logic.
        </p>
        <div className="mt-4 text-sm text-slate-500">
          Viewing:{" "}
          <span className="font-medium text-slate-300">{state.companyName}</span>{" "}
          · Small B2B supplier for cafes and restaurants
        </div>
      </header>

      {/* Dashboard metrics */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Cash Balance"
          value={rm(state.cashBalance)}
          sublabel="Cash on hand today"
          afterValue={simulatedState ? rm(simulatedState.cashBalance) : undefined}
          improved={simulatedState ? simulatedState.cashBalance > state.cashBalance : false}
        />
        <MetricCard
          label="Runway Days"
          value={`${Math.round(health.runwayDays)} days`}
          sublabel="At current burn rate"
          afterValue={after ? `${Math.round(after.runwayDays)} days` : undefined}
          improved={after ? after.runwayDays > health.runwayDays : false}
        />
        <MetricCard
          label="Expected Collections"
          value={rm(health.expectedCollections)}
          sublabel={`${state.invoices.length} outstanding invoices`}
          afterValue={after ? rm(after.expectedCollections) : undefined}
        />
        <MetricCard
          label="Payroll Risk"
          value={health.payrollRisk ? "At Risk" : "Covered"}
          tone={health.payrollRisk ? "bad" : "good"}
          sublabel={`Gap: ${rm(health.payrollGap)}`}
          afterValue={after ? (after.payrollRisk ? "At Risk" : "Covered") : undefined}
          improved={after ? !after.payrollRisk && health.payrollRisk : false}
        />
      </section>

      {/* Payroll risk alert */}
      {health.payrollRisk && (
        <section className="mb-10 rounded-2xl border border-bad/40 bg-bad/10 p-5">
          <div className="flex items-center gap-2 text-bad">
            <span className="text-lg">⚠</span>
            <span className="font-semibold">Emergency Board Meeting Required</span>
          </div>
          <p className="mt-2 text-sm text-slate-300">{health.alertMessage}</p>
        </section>
      )}

      {/* Agent boardroom */}
      <section className="mb-10">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">The Boardroom</h2>
            <p className="max-w-xl text-sm text-slate-400">
              Two specialised AI agents reason sequentially over the same
              financial state — the CFO analyses liquidity first, then the
              Collections Manager reads the CFO&apos;s stance and responds.
            </p>
          </div>
          <button
            onClick={() => convene(state)}
            disabled={boardStatus === "running"}
            className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {boardStatus === "idle"
              ? "Convene the Boardroom"
              : boardStatus === "running"
                ? "Convening…"
                : "Re-convene the Boardroom"}
          </button>
        </div>

        {boardStatus === "idle" && (
          <div className="rounded-2xl border border-dashed border-edge bg-surface/40 p-8 text-center text-sm text-slate-400">
            Click{" "}
            <span className="font-medium text-slate-200">
              Convene the Boardroom
            </span>{" "}
            to generate the CFO and Collections Manager analysis for the current
            financial state.
          </div>
        )}

        {boardStatus !== "idle" && (
          <div className="space-y-4">
            {/* Live orchestration console — the state trace of the API loop. */}
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
              <div className="grid gap-4 lg:grid-cols-2">
                {board.map((agent) => (
                  <AgentCard key={agent.agent} agent={agent} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Owner decision */}
      <section className="mb-10">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white">Your Decision</h2>
          <p className="text-sm text-slate-400">
            Choose a strategy. The simulation engine updates the numbers
            immediately — the AI never invents the outcome.
          </p>
        </div>
        <DecisionPanel onDecide={handleDecide} selected={selected} />
      </section>

      {/* Simulation result */}
      {result && (
        <section className="mb-10 rounded-2xl border border-brand/40 bg-brand/10 p-6">
          <div className="text-xs uppercase tracking-wider text-slate-400">
            Simulated Decision
          </div>
          <h2 className="mt-1 text-2xl font-semibold text-white">
            {result.label}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            {result.explanation}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <ComparisonRow
              label="Cash Balance"
              before={rm(state.cashBalance)}
              after={rm(result.updatedState.cashBalance)}
              improved={result.updatedState.cashBalance > state.cashBalance}
            />
            <ComparisonRow
              label="Runway"
              before={`${Math.round(result.before.runwayDays)} days`}
              after={`${Math.round(result.after.runwayDays)} days`}
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
      <section className="mb-10">
        <CashFlowChart current={state} simulated={simulatedState} />
      </section>

      <footer className="border-t border-edge pt-6 text-xs text-slate-500">
        Project Prism · Deterministic MVP · Numbers come from simulation logic,
        not AI.
      </footer>
    </main>
  );
}

function SourceBadge({ source }: { source: BoardSource | null }) {
  const config: Record<
    BoardSource,
    { dot: string; text: string; label: string }
  > = {
    fireworks: {
      dot: "bg-good",
      text: "text-good",
      label: "Generated live by Fireworks AI · Llama 3.1 70B",
    },
    "partial-fallback": {
      dot: "bg-warn",
      text: "text-warn",
      label: "Partial: one agent live, one static fallback",
    },
    fallback: {
      dot: "bg-warn",
      text: "text-warn",
      label:
        "Offline fallback — static boardroom (set FIREWORKS_API_KEY for live AI)",
    },
  };
  const c = source ? config[source] : config.fallback;

  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span className={`inline-block h-2 w-2 rounded-full ${c.dot}`} />
      <span className={c.text}>{c.label}</span>
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
    <div className="rounded-xl border border-edge bg-panel/60 p-4">
      <div className="text-xs uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm">
        <span className="text-slate-400 line-through decoration-slate-600">
          {before}
        </span>
        <span className="text-slate-500">→</span>
        <span className={`font-semibold ${improved ? "text-good" : "text-white"}`}>
          {after}
        </span>
      </div>
    </div>
  );
}
