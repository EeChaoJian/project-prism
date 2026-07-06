// A single dashboard metric card. Shows a label, a headline value, and an
// optional "after" comparison used once a decision has been simulated.

interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  afterValue?: string; // shown when a simulation result exists
  improved?: boolean; // marks an improved "after" value
}

export default function MetricCard({
  label,
  value,
  sublabel,
  afterValue,
  improved,
}: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-neutral-900">
          {value}
        </span>
      </div>

      {afterValue && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className="text-neutral-400">after</span>
          <span className="font-semibold tracking-tight text-neutral-900">
            {improved ? "↑ " : ""}
            {afterValue}
          </span>
        </div>
      )}

      {sublabel && (
        <div className="mt-1 text-xs text-neutral-500">{sublabel}</div>
      )}
    </div>
  );
}
