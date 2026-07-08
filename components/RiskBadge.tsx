// Risk badge — a 4-segment meter + label. Monochrome, works on light or dark.

import { RISK_INDEX, type RiskLevel } from "@/lib/risk";

interface RiskBadgeProps {
  level: RiskLevel;
  onDark?: boolean;
}

export default function RiskBadge({ level, onDark = false }: RiskBadgeProps) {
  const filled = RISK_INDEX[level];
  const severe = level === "High" || level === "Critical";

  const segFilled = onDark ? "bg-white" : "bg-neutral-900";
  const segEmpty = onDark ? "bg-white/25" : "bg-neutral-200";
  const label = onDark
    ? severe
      ? "bg-white text-neutral-900"
      : "border border-white/40 text-white"
    : severe
      ? "bg-neutral-900 text-white"
      : "border border-neutral-300 text-neutral-700";

  return (
    <span
      className="inline-flex items-center gap-2"
      role="img"
      aria-label={`Risk level: ${level}`}
    >
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-3 w-1.5 rounded-sm ${i <= filled ? segFilled : segEmpty}`}
          />
        ))}
      </span>
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${label}`}
      >
        {level}
      </span>
    </span>
  );
}
