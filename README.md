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
3. Two placeholder agents (**CFO** and **Collections Manager**) give their positions.
4. The owner clicks a decision.
5. `simulateDecision()` deterministically updates the metrics and chart.

---

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router)
- React + TypeScript
- Tailwind CSS
- [Recharts](https://recharts.org/) for the cash projection chart

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

No API keys or environment variables are required for this milestone.

---

## Project structure

```
project-prism/
├── app/
│   ├── layout.tsx          # Root layout + metadata
│   ├── page.tsx            # Dashboard: wires everything together
│   └── globals.css         # Tailwind + background styling
├── components/
│   ├── MetricCard.tsx      # Dashboard metric card (with before/after)
│   ├── AgentCard.tsx       # Placeholder agent card
│   ├── DecisionPanel.tsx   # Owner decision buttons
│   └── CashFlowChart.tsx   # Projected cash chart (Recharts)
├── lib/
│   ├── financialState.ts   # Hardcoded sample SME state
│   ├── healthCheck.ts      # checkFinancialHealth() — deterministic
│   ├── simulation.ts       # simulateDecision() — deterministic
│   └── agents.ts           # Hardcoded agent responses (no AI yet)
├── MASTER_SPEC.md          # Full product spec
├── BUILD_PLAN.md           # Milestone plan
└── .env.example            # Placeholders for future AI keys
```

## The financial logic

`checkFinancialHealth(state)` computes:

| Value                        | Formula                                        |
| ---------------------------- | ---------------------------------------------- |
| Expected collections         | `sum(invoice.amount × collectionProbability)`  |
| Projected cash before payroll| `cashBalance + expectedCollections`            |
| Payroll gap                  | `payrollAmount − projectedCashBeforePayroll`   |
| Payroll risk                 | `payrollGap > 0`                               |
| Runway days                  | `cashBalance ÷ (monthlyOpex ÷ 30)`             |

`simulateDecision(state, action)` supports four actions — *Prioritize Client
Alpha*, *Delay Equipment Purchase*, *Offer Early Payment Discount*, and *Do
Nothing* — and returns the updated state plus before/after health snapshots.

---

## What's next (not in this milestone)

- Fireworks AI (Gemma) to generate the CFO and Collections Manager responses
- The deterministic engine above stays the source of truth for all numbers
