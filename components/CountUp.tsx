"use client";

// Animated number. Counts from `from` (or its previous value) to `value` with
// an ease-out, so financial figures visibly move when a decision is made.
// Respects prefers-reduced-motion.

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  value: number;
  from?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
}

export default function CountUp({
  value,
  from,
  prefix = "",
  suffix = "",
  durationMs = 700,
}: CountUpProps) {
  const [display, setDisplay] = useState(from ?? value);
  const prevRef = useRef(from ?? value);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    prevRef.current = end;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || start === end) {
      setDisplay(end);
      return;
    }

    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(start + (end - start) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return (
    <span className="tabular-nums">
      {prefix}
      {Math.round(display).toLocaleString()}
      {suffix}
    </span>
  );
}
