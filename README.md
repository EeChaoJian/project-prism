# Project Prism

**Explore financial decisions before you make them.**

Project Prism is an AI-powered financial *decision simulator* for small and
medium-sized businesses. Instead of predicting the future, it lets an SME owner
explore **"what happens if I make this decision?"** by simulating the impact on
cash, runway, and payroll risk.

> Built for the AMD Developer Hackathon ACT II — Track 3 (Unicorn Track).

---

## Current milestone: Deterministic MVP

This build is the **deterministic core** — the safety net for the whole demo.
There is **no AI yet**. Every number on the screen comes from plain, testable
TypeScript logic. The agent cards are hardcoded placeholders that will later be
produced by Fireworks AI, with this same data as the offline fallback.

### The core loop

```
Risk detected → agents respond → owner chooses → simulation updates
```

1. A hardcoded sample company (**Prism Cafe Supplies**) is loaded.
2. `checkFinancialHealth()` detects a payroll cash crunch.
3. The owner convenes the boardroom: two AI agents (**CFO**, then **Collections
   Manager**) reason **sequentially** over the same numbers.
4. The owner clicks a decision.
5. `simulateDecision()` deterministically updates the metrics and chart.

---

## The AI boardroom (Milestone 2)

Clicking **Convene the Boardroom** streams a live, two-step analysis:

- **Step 1 — CFO** evaluates the deterministic financial numbers and returns a
  structured JSON strategy (liquidity / runway / payroll focus).
- **Step 2 — Collections Manager** receives the CFO's *literal* output, reads
  its stance, and responds from the receivables angle.

Both inferences run **server-side** in `/api/boardroom` via
[Fireworks AI](https://fireworks.ai) (`llama-v3p1-70b-instruct`). The route
streams NDJSON events so the UI shows a live "Step 1 → Step 2" indicator.

**The AI never invents numbers.** Every figure comes from the deterministic
engine; the agents only produce natural-language reasoning. Their JSON is
schema-validated server-side.

**No key? It still works.** If `FIREWORKS_API_KEY` is missing, the API errors,
or a response fails to decode, the route automatically falls back to the static
mock boardroom in `lib/agents.ts`. A badge under the cards shows whether the
result came from **Fireworks AI** or the **offline fallback**.

---

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router, streaming route handler)
- React + TypeScript
- Tailwind CSS
- [Recharts](https://recharts.org/) for the cash projection chart
- [Fireworks AI](https://fireworks.ai) for the boardroom agents

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

The app runs **with no configuration** — the boardroom uses the offline
fallback. To enable live AI, add a Fireworks key:

```bash
cp .env.example .env.local
# then edit .env.local and set FIREWORKS_API_KEY=fw_...
```

Restart `npm run dev` after changing env vars.

---

## Project structure

```
project-prism/
├── app/
│   ├── api/
│   │   └── boardroom/
│   │       └── route.ts    # Sequential CFO → Collections orchestration (streamed)
│   ├── layout.tsx          # Root layout + metadata
│   ├── page.tsx            # Dashboard: wires everything together
│   └── globals.css         # Tailwind + background styling
├── components/
│   ├── MetricCard.tsx      # Dashboard metric card (with before/after)
│   ├── AgentCard.tsx       # Agent card (static or AI-generated)
│   ├── BoardroomStatus.tsx # Live "Step 1 → Step 2" loading indicator
│   ├── DecisionPanel.tsx   # Owner decision buttons
│   └── CashFlowChart.tsx   # Projected cash chart (Recharts)
├── lib/
│   ├── financialState.ts   # Hardcoded sample SME state
│   ├── healthCheck.ts      # checkFinancialHealth() — deterministic
│   ├── simulation.ts       # simulateDecision() — deterministic (unchanged)
│   ├── agents.ts           # Static mock boardroom (fallback data + shared type)
│   ├── fireworks.ts        # Server-only Fireworks calls + schema enforcement
│   └── useBoardroom.ts     # Client hook: streams /api/boardroom
├── MASTER_SPEC.md          # Full product spec
├── BUILD_PLAN.md           # Milestone plan
└── .env.example            # Fireworks env vars
```

## The financial logic

`checkFinancialHealth(state)` computes:

| Value                        | Formula                                                         |
| ---------------------------- | --------------------------------------------------------------- |
| Expected collections         | `sum(invoice.amount × collectionProbability)`                   |
| Operating burn to payroll    | `monthlyOpex ÷ 30 × payrollDueInDays`                           |
| Projected cash before payroll| `cashBalance + expectedCollections − operatingBurnToPayroll`    |
| Payroll gap                  | `payrollAmount − projectedCashBeforePayroll`                    |
| Payroll risk                 | `payrollGap > 0`                                                |
| Runway days                  | `cashBalance ÷ (monthlyOpex ÷ 30)`                             |

> Projected cash before payroll nets out `operatingBurnToPayroll` — the
> operating cash the business burns over the days until payroll — so the
> deterministic engine reflects the real cash crunch ahead of payday.

`simulateDecision(state, action)` supports four actions — *Prioritize Client
Alpha*, *Delay Equipment Purchase*, *Offer Early Payment Discount*, and *Do
Nothing* — and returns the updated state plus before/after health snapshots.

---

## Testing the boardroom locally

**Offline / fallback (no key needed):**

1. `npm run dev`, open http://localhost:3000.
2. Click **Convene the Boardroom**. Watch the Step 1 → Step 2 indicator, then
   two cards appear with a **"Offline fallback"** badge.

You can also hit the API directly:

```bash
curl -N -X POST http://localhost:3000/api/boardroom \
  -H "Content-Type: application/json" -d '{}'
```

You'll see the streamed NDJSON events (`step`, `agent`, `agent`, `done`) with
`"source":"fallback"`.

**Live AI (with a Fireworks key):**

1. `cp .env.example .env.local` and set `FIREWORKS_API_KEY=fw_...`.
2. Restart `npm run dev`, click **Convene the Boardroom**.
3. The badge now reads **"Generated live by Fireworks AI"**, and the second
   agent's reasoning explicitly references the CFO's stance.

If the key is invalid or the API is unreachable, the run still completes using
the fallback — the demo never breaks.

---

## What's next (not in this milestone)

- Parallel / multi-round agent debate beyond the two-step sequence
- Streaming token-level output into the cards
- The deterministic engine stays the source of truth for all numbers
