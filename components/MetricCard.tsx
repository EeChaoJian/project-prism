// A single dashboard metric card. Shows a label, a headline value, and an
// optional "after" comparison used once a decision has been simulated.

interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  afterValue?: string; // shown when a simulation result exists
  improved?: boolean; // marks an improved "after" value
  featured?: boolean;
}

export default function MetricCard({
  label,
  value,
  sublabel,
  afterValue,
  improved,
  featured = false,
}: MetricCardProps) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md ${
        featured
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-200/80 bg-white"
      }`}
    >
      <div
        className={`text-xs font-medium uppercase tracking-wider ${
          featured ? "text-white/60" : "text-neutral-500"
        }`}
      >
        {label}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={`text-2xl font-semibold tracking-tight ${
            featured ? "text-white" : "text-neutral-900"
          }`}
        >
          {value}
        </span>
      </div>

      {afterValue && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className={featured ? "text-white/50" : "text-neutral-400"}>
            after
          </span>
          <span
            className={`font-semibold tracking-tight ${
              featured ? "text-white" : "text-neutral-900"
            }`}
          >
            {improved ? "↑ " : ""}
            {afterValue}
          </span>
        </div>
      )}

      {sublabel && (
        <div className={`mt-1 text-xs ${featured ? "text-white/60" : "text-neutral-500"}`}>
          {sublabel}
        </div>
      )}
    </div>
  );
}
