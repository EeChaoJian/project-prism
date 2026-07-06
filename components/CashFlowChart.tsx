"use client";

// Simple projected-cash chart. Plots cash on hand across the days leading up
// to payroll. When a decision has been simulated we overlay the "after" line
// so the owner can see the impact. A reference line marks the payroll amount.

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FinancialState } from "@/lib/financialState";
import { checkFinancialHealth } from "@/lib/healthCheck";

// Project a straightforward daily cash trajectory:
// start from cash + expected collections today, then subtract the daily
// operating burn each day. By the payroll due day this lands on the
// deterministic projectedCashBeforePayroll from checkFinancialHealth().
function projectSeries(state: FinancialState): number[] {
  const health = checkFinancialHealth(state);
  const startCash = state.cashBalance + health.expectedCollections;
  const dailyBurn = state.monthlyOpex / 30;
  const days = state.payrollDueInDays;
  const series: number[] = [];
  for (let day = 0; day <= days; day++) {
    series.push(Math.round(startCash - dailyBurn * day));
  }
  return series;
}

interface CashFlowChartProps {
  current: FinancialState;
  simulated?: FinancialState | null;
  payrollAmount: number;
}

export default function CashFlowChart({
  current,
  simulated,
  payrollAmount,
}: CashFlowChartProps) {
  const beforeSeries = projectSeries(current);
  const afterSeries = simulated ? projectSeries(simulated) : null;

  const data = beforeSeries.map((before, day) => ({
    day: `Day ${day}`,
    before,
    ...(afterSeries ? { after: afterSeries[day] } : {}),
  }));

  return (
    <div className="rounded-2xl border border-edge bg-surface p-5 shadow-lg shadow-black/20">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-white">
          Projected Cash to Payroll
        </h3>
        <p className="text-xs text-slate-400">
          Daily cash on hand until payroll is due. The dashed line is the
          RM{payrollAmount.toLocaleString()} payroll obligation.
        </p>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="beforeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f87171" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="afterFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#26324a" />
          <XAxis
            dataKey="day"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickFormatter={(v) => `RM${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              background: "#111827",
              border: "1px solid #26324a",
              borderRadius: 12,
              color: "#e2e8f0",
            }}
            formatter={(value: number) => `RM${value.toLocaleString()}`}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#cbd5e1" }} />

          <ReferenceLine
            y={payrollAmount}
            stroke="#f59e0b"
            strokeDasharray="6 4"
            label={{ value: "Payroll", fill: "#f59e0b", fontSize: 11, position: "insideTopRight" }}
          />

          <Area
            type="monotone"
            dataKey="before"
            name="Current plan"
            stroke="#f87171"
            fill="url(#beforeFill)"
            strokeWidth={2}
          />
          {afterSeries && (
            <Area
              type="monotone"
              dataKey="after"
              name="After decision"
              stroke="#34d399"
              fill="url(#afterFill)"
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
