# Project Prism

**AI Boardroom for SME financial decisions.**

Project Prism turns a payroll crisis into a boardroom decision: two AI agents
argue the trade-off, then a deterministic simulation shows what the owner's
choice does to cash, runway, and payroll risk.

> Built for the AMD Developer Hackathon ACT II — Track 3 (Unicorn Track).

---

## The problem

Small businesses often do not fail because revenue disappears. They fail
because owners see the cash crunch too late and choose without understanding
the effect on payroll, runway, and overdue invoices.

## The demo

```
Payroll alert
    ↓
AI boardroom
    ↓
Owner decision
    ↓
Simulation engine
    ↓
Updated cash position
```

The demo starts with an emergency board meeting. Payroll may fail in 18 days.
The CFO argues for preserving cash. The Collections Manager disagrees and
pushes receivables recovery. The owner chooses a response, and the simulation
updates the numbers instantly.

Accounting software tells you what happened. Project Prism lets you rehearse a
decision before it happens.

## Why AI

The AI does not calculate the outcome. It explains the trade-off.

The deterministic engine owns the math:

```
Financial inputs
        │
        ▼
Deterministic simulation
        │
        ▼
Updated metrics
        ▲
        │
AI boardroom reasoning
```

That split is the product's credibility: useful boardroom reasoning without
letting the model invent financial numbers.

---

## Architecture

This build pairs a **deterministic core** — the safety net for the whole demo —
with a completed, live **sequential streaming multi-agent boardroom**. The CFO
and Collections Manager run as two sequential Fireworks AI inferences: the
CFO's output is streamed into the Collections Manager's context so the agents
can disagree from different priorities. Every number on the screen still comes
from plain, testable TypeScript logic, and the boardroom falls back to a static,
schema-identical mock whenever a key is absent or a call fails.

### The core loop

```
Risk detected → agents respond → owner chooses → simulation updates
```

1. A hardcoded sample company (**Harbour Coffee Roasters**) is loaded.
2. `checkFinancialHealth()` detects a payroll cash crunch.
3. The owner convenes the boardroom: two AI agents (**CFO**, then **Collections
   Manager**) reason **sequentially** over the same numbers.
4. The owner clicks a decision.
5. `simulateDecision()` deterministically updates the metrics and chart.

---

## The AI boardroom (Milestone 2)

Clicking **Convene the Boardroom** streams a live, two-step analysis:

- **Step 1 — CFO** evaluates the deterministic financial numbers and returns a
  headline, recommendation, three bullets, primary risk, and scenario confidence.
- **Step 2 — Collections Manager** receives the CFO's *literal* output, reads
  its stance, and responds from the receivables angle.

Both inferences run **server-side** in `/api/boardroom` via
[Fireworks AI](https://fireworks.ai) (`llama-v3p1-70b-instruct`). The route
streams NDJSON events so the UI shows a live "Step 1 → Step 2" indicator.

**The AI never invents numbers.** Every figure comes from the deterministic
engine; the agents only produce natural-language reasoning. Their JSON is
schema-validated server-side.

**Scenario confidence is deterministic.** The displayed confidence reflects
whether that agent's recommended response protects payroll in the simulation.

**Benchmark data is synthetic.** The lookalike cohort is hardcoded demo
benchmark data for the hackathon. It is used only as illustrative context, not
as verified market evidence.

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

The app runs **with no setup** — the boardroom uses the offline
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
│   │       └── route.ts    # Sequential CFO → Collections boardroom stream
│   ├── layout.tsx          # Root layout + metadata
│   ├── page.tsx            # Dashboard: wires everything together
│   └── globals.css         # Tailwind + background styling
├── components/
│   ├── MetricCard.tsx           # Dashboard metric card (with before/after)
│   ├── AgentCard.tsx            # Agent card: recommendation, bullets, risk, confidence
│   ├── BoardroomStatus.tsx      # Compact sequential step indicator
│   ├── OrchestrationConsole.tsx # Live boardroom thinking trace
│   ├── DecisionPanel.tsx        # Owner decision buttons
│   └── CashFlowChart.tsx        # Projected cash chart (Recharts)
├── lib/
│   ├── financialState.ts   # Hardcoded sample SME state
│   ├── healthCheck.ts      # checkFinancialHealth() — deterministic
│   ├── simulation.ts       # simulateDecision() — deterministic (unchanged)
│   ├── agents.ts           # Static mock boardroom (fallback data + shared type)
│   ├── fireworks.ts        # Server-only Fireworks calls + schema enforcement
│   ├── boardroom.ts        # Shared streamed-event protocol + phase types
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
