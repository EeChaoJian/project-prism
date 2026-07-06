# Project Prism — Build Plan

A milestone-based plan. Each milestone is shippable on its own. The
deterministic core is built **first** so the demo never depends on a live AI
call.

---

## ✅ Milestone 1 — Deterministic MVP (this build)

Goal: a fully working demo with **no AI**. Every number is deterministic.

- [x] Hardcoded sample financial state (`Prism Cafe Supplies`)
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

## ⏳ Milestone 2 — AI agents (not started)

Goal: replace the hardcoded agent data with live reasoning.

- [ ] Fireworks AI integration (Gemma model if available)
- [ ] Shared financial context passed to each agent
- [ ] Structured JSON agent output (same shape as `AgentResponse`)
- [ ] Hardcoded fallback responses if the API fails (already in place)
- [ ] Environment variables for the API key

**Guardrail:** the AI explains trade-offs and recommends actions, but it must
never invent financial numbers. All numeric outcomes stay in `simulation.ts`.

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
