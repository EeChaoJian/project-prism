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
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm transition-all duration-200">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-neutral-900">
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
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-xs text-white">
                    ✓
                  </span>
                ) : isActive ? (
                  <Spinner />
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
                )}
              </span>
              <span
                className={
                  isDone
                    ? "text-sm text-neutral-500"
                    : isActive
                      ? "text-sm font-medium text-neutral-900"
                      : "text-sm text-neutral-400"
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
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900"
      aria-hidden
    />
  );
}
