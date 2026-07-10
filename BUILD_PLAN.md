# Project Prism — Build Plan

A milestone-based plan. Each milestone is shippable on its own. The
deterministic core is built **first** so the demo never depends on a live AI
call.

---

## ✅ Milestone 1 — Deterministic MVP (this build)

Goal: a fully working demo with **no AI**. Every number is deterministic.

- [x] Hardcoded sample financial state (`Harbour Coffee Roasters`)
- [x] `checkFinancialHealth()` — expected collections, projected cash, payroll
      gap, runway, payroll-risk flag, alert message
- [x] `simulateDecision()` — four owner actions with before/after snapshots
- [x] Dashboard metric cards (Cash, Runway, Expected Collections, Payroll Risk)
- [x] Payroll risk alert ("Emergency Board Meeting Required")
- [x] Two placeholder agent cards (CFO, Collections Manager)
- [x] Decision buttons
- [x] Before / after metric updates
- [x] Simple projected cash chart (Recharts)
- [x] README + this build plan

**Definition of done:** app loads without errors, metrics show correctly,
payroll alert appears, decisions update metrics + chart immediately.

---

## ✅ Milestone 2 — Sequential AI boardroom (this build)

Goal: replace the hardcoded agent cards with live, sequential AI reasoning.

- [x] Fireworks AI integration (`accounts/fireworks/models/minimax-m3`)
- [x] Server-side route `/api/boardroom` orchestrating two inferences
- [x] INFERENCE 1 (CFO) → structured JSON strategy
- [x] INFERENCE 2 (Collections Manager) receives the CFO's literal output and
      responds, acknowledging the CFO's structural stance
- [x] Shared financial context passed to each agent (MASTER_SPEC §14)
- [x] Structured JSON output, schema-validated server-side
- [x] Try/catch guards → automatic fallback to the static mock boardroom
- [x] Live sequential loading indicator (Step 1 → Step 2) via streamed NDJSON
- [x] Environment variables for the API key (`.env.example`)

**Guardrail (held):** the deterministic engine in `simulation.ts` and
`healthCheck.ts` is unchanged. The AI produces reasoning only; every number
comes from that engine.

---

## 🔭 Later (post-hackathon, not scoped)

- Real bank / accounting integrations
- Invoice parsing
- Predictive cash-flow modelling
- Multi-scenario planning

---

## Build discipline

Do not add features until the core loop is perfect:

```
Risk detected → agents respond → owner chooses → simulation updates
```

If a feature does not strengthen this loop, cut it.
