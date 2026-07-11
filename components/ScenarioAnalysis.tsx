// Scenario analysis — the GPU risk layer.
//
// The deterministic engine gives each option ONE expected outcome. This panel
// adds the *distribution* around it: 50,000 simulated futures per option,
// computed on an AMD Instinct GPU (ROCm/PyTorch), summarised as the probability
// that payroll survives. It is additive to the deterministic result, never a
// replacement — the mean of the paths reconciles with checkFinancialHealth().
//
// Data is a committed snapshot from notebooks/amd_scenario_analysis.ipynb.
// Because the snapshot is computed for the sample business, the panel hides
// itself whenever the owner has edited the numbers (the analysis would no
// longer apply — run the notebook on the new figures to refresh it).

import scenario from "@/public/data/scenario_analysis.json";
import type { DecisionAction } from "@/lib/simulation";

interface ScenarioOption {
  action: string;
  label: string;
  survivalProbability: number;
  deterministicProjectedCash: number;
  deterministicPayrollGap: number;
  meanProjectedCash: number;
  p10ProjectedCash: number;
  p90ProjectedCash: number;
}

const rm = (n: number) => `RM${Math.round(n).toLocaleString()}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

interface ScenarioAnalysisProps {
  payrollGap: number; // current deterministic gap — used to match the snapshot
  selected: DecisionAction | null;
}

export default function ScenarioAnalysis({
  payrollGap,
  selected,
}: ScenarioAnalysisProps) {
  const options = scenario.options as ScenarioOption[];

  // Only show when the live scenario matches the snapshot the GPU computed.
  const snapshotGap = options.find((o) => o.action === "do_nothing")
    ?.deterministicPayrollGap;
  const matchesSnapshot =
    snapshotGap !== undefined && Math.round(payrollGap) === snapshotGap;
  if (!matchesSnapshot) return null;

  const best = options[0]; // pre-sorted by survival probability, descending
  const onGpu = !scenario.device.startsWith("cpu");

  return (
    <section className="mb-12">
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
            Scenario analysis
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                onGpu ? "bg-neutral-900" : "bg-neutral-400"
              }`}
            />
            {scenario.paths.toLocaleString()} simulated futures ·{" "}
            {onGpu ? "AMD Instinct GPU" : "AMD pipeline (CPU snapshot)"}
          </span>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-neutral-500">
          The comparison above shows each option&apos;s expected outcome. This is
          the risk <em>around</em> it — how often payroll actually survives once
          collections and operating burn vary. Even the strongest option holds in
          only {pct(best.survivalProbability)} of futures: this is a severe
          position, not a solved one.
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
        Payroll survives = projected cash clears the {rm(scenario.payrollAmount)}{" "}
        payroll. Means reconcile with the deterministic engine; variance
        assumptions are illustrative, not fitted from real data. Computed by{" "}
        <span className="font-mono">notebooks/amd_scenario_analysis.ipynb</span>{" "}
        on {scenario.device.split(" —")[0]}.
      </p>
    </section>
  );
}
