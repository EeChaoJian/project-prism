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
}

export default function CashFlowChart({
  current,
  simulated,
}: CashFlowChartProps) {
  const payrollAmount = current.payrollAmount;
  const beforeSeries = projectSeries(current);
  const afterSeries = simulated ? projectSeries(simulated) : null;

  const data = beforeSeries.map((before, day) => ({
    day: `Day ${day}`,
    before,
    ...(afterSeries ? { after: afterSeries[day] } : {}),
  }));

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm transition-all duration-200">
      <div className="mb-4">
        <h3 className="text-base font-semibold tracking-tight text-neutral-900">
          Projected Cash to Payroll
        </h3>
        <p className="text-xs text-neutral-500">
          Daily cash on hand until payroll is due. The dashed line is the
          RM{payrollAmount.toLocaleString()} payroll obligation.
        </p>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="beforeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a3a3a3" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#a3a3a3" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="afterFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#171717" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#171717" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis
            dataKey="day"
            tick={{ fill: "#737373", fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#737373", fontSize: 11 }}
            tickFormatter={(v) => `RM${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e5e5e5",
              borderRadius: 12,
              color: "#171717",
            }}
            formatter={(value: number) => `RM${value.toLocaleString()}`}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#737373" }} />

          <ReferenceLine
            y={payrollAmount}
            stroke="#737373"
            strokeDasharray="6 4"
            label={{ value: "Payroll", fill: "#737373", fontSize: 11, position: "insideTopRight" }}
          />

          <Area
            type="monotone"
            dataKey="before"
            name="Current plan"
            stroke="#a3a3a3"
            fill="url(#beforeFill)"
            strokeWidth={2}
          />
          {afterSeries && (
            <Area
              type="monotone"
              dataKey="after"
              name="After decision"
              stroke="#171717"
              fill="url(#afterFill)"
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
