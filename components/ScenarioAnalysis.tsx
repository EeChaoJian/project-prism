"use client";

// Scenario analysis — the risk distribution around the deterministic estimate.
//
// The deterministic engine gives each option ONE expected outcome. This panel
// adds the *distribution* around it: 50,000 simulated futures per option,
// summarised as the probability that payroll survives. Additive to the
// deterministic result, never a replacement.
//
// It computes live (lib/scenario.ts) so it is a real feature for ANY business
// the owner enters, always consistent with the engine. The same 50,000-path
// simulation runs at scale on an AMD Instinct GPU in
// notebooks/amd_scenario_analysis.ipynb (committed output in public/data) — the
// credit line below points there rather than claiming the in-browser run used
// the GPU.

import { useMemo } from "react";
import type { FinancialState } from "@/lib/financialState";
import { computeScenario } from "@/lib/scenario";
import type { DecisionAction, DecisionParameters } from "@/lib/simulation";

const rm = (n: number) => `RM${Math.round(n).toLocaleString()}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

interface ScenarioAnalysisProps {
  company: FinancialState;
  params: DecisionParameters;
  selected: DecisionAction | null;
}

export default function ScenarioAnalysis({
  company,
  params,
  selected,
}: ScenarioAnalysisProps) {
  // Recompute whenever the business or its assumptions change.
  const scenario = useMemo(
    () => computeScenario(company, params),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(company), JSON.stringify(params)]
  );

  const { options, paths, payrollAmount } = scenario;
  const best = options[0];
  if (!best) return null;

  return (
    <section className="mb-12">
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
            Scenario analysis
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-900" />
            {paths.toLocaleString()} simulated futures
          </span>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-neutral-500">
          The comparison above shows each option&apos;s expected outcome. This is
          the risk <em>around</em> it — how often payroll actually survives once
          collections and operating burn vary.{" "}
          {best.survivalProbability < 0.5
            ? `Even the strongest option holds in only ${pct(
                best.survivalProbability
              )} of futures: a severe position, not a solved one.`
            : `The strongest option protects payroll in ${pct(
                best.survivalProbability
              )} of futures — clearly ahead of the alternatives, but not risk-free.`}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
        <div className="divide-y divide-neutral-100">
          {options.map((o) => {
            const isBest = o.action === best.action;
            const isSelected = o.action === selected;
            return (
              <div
                key={o.action}
                className={`flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:gap-5 ${
                  isSelected ? "bg-neutral-50" : ""
                }`}
              >
                <div className="flex w-full items-center justify-between sm:w-64 sm:shrink-0">
                  <span className="text-sm font-medium text-neutral-900">
                    {o.label}
                  </span>
                  {isBest && (
                    <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Best odds
                    </span>
                  )}
                </div>

                <div className="flex flex-1 items-center gap-3">
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100"
                    role="img"
                    aria-label={`${o.label}: payroll survives in ${pct(
                      o.survivalProbability
                    )} of simulated futures`}
                  >
                    <div
                      className={`h-full rounded-full ${
                        isBest ? "bg-neutral-900" : "bg-neutral-400"
                      }`}
                      style={{ width: `${o.survivalProbability * 100}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-neutral-900">
                    {pct(o.survivalProbability)}
                  </span>
                </div>

                <div className="shrink-0 text-xs text-neutral-400 sm:w-40 sm:text-right">
                  cash {rm(o.p10ProjectedCash)}–{rm(o.p90ProjectedCash)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-xs text-neutral-400">
        Payroll survives = projected cash clears the {rm(payrollAmount)} payroll.
        Simulated live and consistent with the deterministic engine; variance
        assumptions are illustrative, not fitted from real data. The same
        50,000-path simulation runs at scale on an AMD Instinct GPU (ROCm /
        PyTorch) — see{" "}
        <span className="font-mono">notebooks/amd_scenario_analysis.ipynb</span>.
      </p>
    </section>
  );
}
