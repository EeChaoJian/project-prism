// Decision assumptions.
//
// Lets the owner choose the assumptions behind each boardroom choice. Values
// feed straight into simulateDecision(), so the decision buttons, result panel,
// and metric deltas always reflect the selected scenario.

import type { FinancialState } from "@/lib/financialState";
import type { DecisionParameters } from "@/lib/simulation";

const INPUT =
  "w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none";
const LABEL = "mb-1 block text-[11px] font-medium uppercase tracking-wider text-neutral-500";

interface DecisionCustomizerProps {
  state: FinancialState;
  params: DecisionParameters;
  onChange: (next: DecisionParameters) => void;
}

export default function DecisionCustomizer({
  state,
  params,
  onChange,
}: DecisionCustomizerProps) {
  // Parse a numeric input defensively; empty/invalid becomes 0.
  const num = (raw: string, max = Number.MAX_SAFE_INTEGER) =>
    Math.min(max, Math.max(0, Number(raw) || 0));

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm transition-all duration-200">
      <div className="mb-4">
        <h3 className="text-sm font-semibold tracking-tight text-neutral-900">
          Decision Assumptions
        </h3>
        <p className="text-xs text-neutral-500">
          Choose the assumptions behind each response. The simulation and
          decision cards update from these values.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Receivable recovery */}
        <fieldset className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <legend className="px-1 text-xs font-semibold text-neutral-900">
            Aggressively Recover Receivable
          </legend>
          <div className="space-y-2.5 pt-1">
            <div>
              <label htmlFor="dc-target" className={LABEL}>
                Target Client
              </label>
              <select
                id="dc-target"
                className={INPUT}
                value={params.recoveryTargetClient}
                onChange={(e) =>
                  onChange({ ...params, recoveryTargetClient: e.target.value })
                }
              >
                {state.invoices.length === 0 ? (
                  <option value="">No invoices available</option>
                ) : (
                  state.invoices.map((inv) => (
                    <option key={inv.client} value={inv.client}>
                      {inv.client} (RM{inv.amount.toLocaleString()})
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label htmlFor="dc-recovery" className={LABEL}>
                Target Recovery Amount (RM)
              </label>
              <input
                id="dc-recovery"
                type="number"
                min={0}
                className={INPUT}
                value={params.recoveryAmount}
                onChange={(e) =>
                  onChange({ ...params, recoveryAmount: num(e.target.value) })
                }
              />
            </div>
            <div>
              <label htmlFor="dc-prob" className={LABEL}>
                Settlement Confidence (%)
              </label>
              <input
                id="dc-prob"
                type="number"
                min={0}
                max={100}
                className={INPUT}
                value={Math.round(params.recoveryProbability * 100)}
                onChange={(e) =>
                  onChange({
                    ...params,
                    recoveryProbability: num(e.target.value, 100) / 100,
                  })
                }
              />
            </div>
          </div>
        </fieldset>

        {/* Capex deferral */}
        <fieldset className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <legend className="px-1 text-xs font-semibold text-neutral-900">
            Defer Capital Expenditure
          </legend>
          <div className="space-y-2.5 pt-1">
            <div>
              <label htmlFor="dc-capex" className={LABEL}>
                Cash Preserved by Freezing Purchase (RM)
              </label>
              <input
                id="dc-capex"
                type="number"
                min={0}
                className={INPUT}
                value={params.capexSavings}
                onChange={(e) =>
                  onChange({ ...params, capexSavings: num(e.target.value) })
                }
              />
            </div>
            <p className="text-[11px] leading-relaxed text-neutral-500">
              Scheduled equipment payment on file:{" "}
              <span className="font-medium text-neutral-900">
                RM{state.equipmentPurchase.toLocaleString()}
              </span>
            </p>
          </div>
        </fieldset>

        {/* Early settlement incentive */}
        <fieldset className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <legend className="px-1 text-xs font-semibold text-neutral-900">
            Early Settlement Incentive
          </legend>
          <div className="space-y-2.5 pt-1">
            <div>
              <label htmlFor="dc-accel" className={LABEL}>
                Liquid Cash Accelerated (RM)
              </label>
              <input
                id="dc-accel"
                type="number"
                min={0}
                className={INPUT}
                value={params.acceleratedCash}
                onChange={(e) =>
                  onChange({ ...params, acceleratedCash: num(e.target.value) })
                }
              />
            </div>
            <div>
              <label htmlFor="dc-discount" className={LABEL}>
                Margin Discount Applied (%)
              </label>
              <input
                id="dc-discount"
                type="number"
                min={0}
                max={100}
                className={INPUT}
                value={params.discountPercent}
                onChange={(e) =>
                  onChange({
                    ...params,
                    discountPercent: num(e.target.value, 100),
                  })
                }
              />
            </div>
          </div>
        </fieldset>
      </div>
    </div>
  );
}
