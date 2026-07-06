// Live sequential indicator for the boardroom run. Each step shows one of
// three states: done (✓), active (spinner), or pending (dim). Driven by the
// NDJSON events streamed from /api/boardroom.

interface BoardroomStatusProps {
  steps: string[];
  activeStep: number; // 1-based index currently processing (0 = none yet)
  doneCount: number; // number of agents that have arrived
}

export default function BoardroomStatus({
  steps,
  activeStep,
  doneCount,
}: BoardroomStatusProps) {
  return (
    <div className="rounded-2xl border border-brand/40 bg-brand/5 p-6">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-accent">
        <Spinner />
        Convening the boardroom…
      </div>

      <ol className="space-y-3">
        {steps.map((label, i) => {
          const stepNumber = i + 1;
          const isDone = doneCount >= stepNumber;
          const isActive = !isDone && activeStep === stepNumber;

          return (
            <li key={stepNumber} className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                {isDone ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-good/20 text-good">
                    ✓
                  </span>
                ) : isActive ? (
                  <Spinner />
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-edge" />
                )}
              </span>
              <span
                className={
                  isDone
                    ? "text-sm text-slate-300"
                    : isActive
                      ? "text-sm font-medium text-white"
                      : "text-sm text-slate-500"
                }
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent"
      aria-hidden
    />
  );
}
