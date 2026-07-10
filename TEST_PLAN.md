# Project Prism Test Plan

Feature freeze note: no test framework is currently installed, so this plan
documents the deterministic tests that should be added if a runner is introduced.

## healthCheck()

- Computes expected collections as `sum(invoice.amount * collectionProbability)`.
- Clamps negative cash, invoice amounts, opex, payroll, and probabilities.
- Treats scheduled `equipmentPurchase` as a cash outflow before payroll.
- Reports payroll risk when `payrollAmount > projectedCashBeforePayroll`.
- Computes runway from current cash and daily operating burn only.

## defaultDecisionParameters()

- Selects the largest invoice as `recoveryTargetClient`.
- Sets `recoveryAmount` to 90% of the target invoice amount.
- Sets `recoveryProbability` from the target invoice collection probability.
- Sets `capexSavings` from `equipmentPurchase`.
- Sets `acceleratedCash` from total outstanding receivables.
- Returns safe zero defaults when no invoices exist.

## simulateDecision()

- Does not mutate the input financial state.
- `prioritize_alpha` increases cash only by the collected amount.
- `prioritize_alpha` reduces the target invoice by the same collected amount.
- `prioritize_alpha` removes the target invoice only when fully collected.
- `early_payment_discount` increases cash only by receivables actually collected.
- `early_payment_discount` reduces outstanding invoices by the same collected amount.
- `early_payment_discount` never collects more than total outstanding receivables.
- `delay_equipment` does not directly increase current cash.
- `delay_equipment` reduces scheduled equipment outflow, improving projected payroll coverage.
- `do_nothing` leaves cash, invoices, and equipment purchase unchanged.

## recommendedAction()

- Returns `do_nothing` when payroll is already covered.
- Otherwise chooses the action with the smallest payroll gap.
- Uses runway as the tie-breaker when payroll gaps match.

## Payroll Coverage Score

- Returns a value from 0 to 1.
- Uses deterministic simulation output rather than model output.
- Returns 1 when payroll amount is zero or negative.
- Reflects the selected action's projected cash before payroll divided by payroll amount.

## Boardroom API Validation

- Falls back to the demo company for malformed request bodies.
- Rejects malformed invoice entries without throwing.
- Clamps negative numeric values before they reach the boardroom prompt.
- Keeps Fireworks failures isolated so the fallback boardroom still completes.

## Stream Parser

- Ignores malformed JSON stream lines.
- Ignores unknown event shapes.
- Accepts only known phase, log, agent, and done events.
- Completes safely if the stream closes without an explicit `done` event.
