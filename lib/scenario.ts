// Live in-browser Monte Carlo scenario analysis.
//
// The deterministic engine gives each option ONE expected outcome. This adds
// the *distribution* around it: many simulated futures per option, summarised
// as the probability that payroll survives. It works for ANY business the owner
// enters — not only a precomputed sample.
//
// Robustness: rather than re-deriving each action's cash effect (which drifts
// whenever the engine changes), this runs the real engine — simulateDecision()
// for the per-action state, then mirrors checkFinancialHealth()'s projected-cash
// formula while varying only the two honest sources of uncertainty:
//   1. Collections — each remaining invoice settles or not (Bernoulli).
//   2. Operating burn — Normal around the deterministic burn (+/-10%).
// Mean-preserving: the average of the paths reconciles with the engine's number.
//
// The large-scale version of this same computation runs on an AMD Instinct GPU
// in notebooks/amd_scenario_analysis.ipynb. Seeded (mulberry32) so server and
// client render identically — no flicker.

import type { FinancialState } from "./financialState";
import {
  defaultDecisionParameters,
  simulateDecision,
  type DecisionAction,
  type DecisionParameters,
} from "./simulation";

export interface ScenarioOptionResult {
  action: DecisionAction;
  label: string;
  survivalProbability: number;
  deterministicPayrollGap: number;
  meanProjectedCash: number;
  p10ProjectedCash: number;
  p90ProjectedCash: number;
}

export interface ScenarioResult {
  paths: number;
  payrollAmount: number;
  options: ScenarioOptionResult[]; // sorted by survival probability, descending
  recommended: DecisionAction;
}

const DEFAULT_PATHS = 50_000;
const BURN_SIGMA_FRAC = 0.1; // operating burn swings +/-10% over the window
const DEFAULT_SEED = 20260711;

const ACTIONS: DecisionAction[] = [
  "prioritize_alpha",
  "delay_equipment",
  "early_payment_discount",
  "do_nothing",
];

// Tiny seeded PRNG — reproducible across server/client renders.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const safe = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);

function percentile(sortedAsc: Float64Array, q: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.max(0, Math.round(q * (sortedAsc.length - 1)))
  );
  return sortedAsc[idx];
}

export function computeScenario(
  state: FinancialState,
  params: DecisionParameters = defaultDecisionParameters(state),
  paths: number = DEFAULT_PATHS,
  seed: number = DEFAULT_SEED
): ScenarioResult {
  const rand = mulberry32(seed);
  // Standard normal via Box-Muller, sharing the seeded stream.
  const gauss = () => {
    const u = 1 - rand();
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const payroll = safe(state.payrollAmount);
  const days =
    Number.isFinite(state.payrollDueInDays) && state.payrollDueInDays > 0
      ? state.payrollDueInDays
      : 1;

  const options: ScenarioOptionResult[] = ACTIONS.map((action) => {
    // Run the real engine for this action's post-decision state + gap.
    const sim = simulateDecision(state, action, params);
    const u = sim.updatedState;

    const cash = safe(u.cashBalance);
    const equipment = safe(u.equipmentPurchase);
    const burnMean = (safe(u.monthlyOpex) / 30) * days;
    const burnSigma = BURN_SIGMA_FRAC * burnMean;
    const pool = u.invoices.map((i) => ({
      amount: safe(i.amount),
      prob: Math.min(1, Math.max(0, safe(i.collectionProbability))),
    }));

    const projected = new Float64Array(paths);
    let survivors = 0;
    let sum = 0;
    for (let p = 0; p < paths; p++) {
      let collections = 0;
      for (const inv of pool) {
        if (rand() < inv.prob) collections += inv.amount;
      }
      const burn = burnMean + gauss() * burnSigma;
      // Mirrors checkFinancialHealth(): cash + collections - burn - capex.
      const cashAtPayroll = cash + collections - burn - equipment;
      projected[p] = cashAtPayroll;
      sum += cashAtPayroll;
      if (cashAtPayroll >= payroll) survivors++;
    }
    projected.sort();

    return {
      action,
      label: sim.label,
      survivalProbability: paths > 0 ? survivors / paths : 0,
      deterministicPayrollGap: Math.round(sim.after.payrollGap),
      meanProjectedCash: paths > 0 ? Math.round(sum / paths) : 0,
      p10ProjectedCash: Math.round(percentile(projected, 0.1)),
      p90ProjectedCash: Math.round(percentile(projected, 0.9)),
    };
  });

  options.sort((a, b) => b.survivalProbability - a.survivalProbability);

  return {
    paths,
    payrollAmount: payroll,
    options,
    recommended: options[0]?.action ?? "do_nothing",
  };
}
