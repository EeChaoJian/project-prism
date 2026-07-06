// A single dashboard metric card. Shows a label, a headline value, and an
// optional "after" comparison used once a decision has been simulated.

type Tone = "neutral" | "good" | "warn" | "bad";

const toneStyles: Record<Tone, string> = {
  neutral: "text-white",
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
};

interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  tone?: Tone;
  afterValue?: string; // shown when a simulation result exists
  improved?: boolean; // colours the delta arrow
}

export default function MetricCard({
  label,
  value,
  sublabel,
  tone = "neutral",
  afterValue,
  improved,
}: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-edge bg-surface p-5 shadow-lg shadow-black/20">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-2xl font-semibold ${toneStyles[tone]}`}>
          {value}
        </span>
      </div>

      {afterValue && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className="text-slate-500">after</span>
          <span
            className={`font-semibold ${
              improved ? "text-good" : "text-slate-200"
            }`}
          >
            {improved ? "↑ " : ""}
            {afterValue}
          </span>
        </div>
      )}

      {sublabel && (
        <div className="mt-1 text-xs text-slate-500">{sublabel}</div>
      )}
    </div>
  );
}
