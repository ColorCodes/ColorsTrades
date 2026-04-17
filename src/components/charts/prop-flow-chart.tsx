"use client";
import * as React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import type { FlowPoint } from "@/lib/propFlow";
import { formatCurrency } from "@/lib/utils";

export function PropFlowChart({ data }: { data: FlowPoint[] }) {
  const [showNet, setShowNet] = React.useState(true);
  const [cumulative, setCumulative] = React.useState(true);

  const chartData = data.map((d) => ({
    ...d,
    plotIncome: cumulative ? d.cumIncome : d.income,
    plotExpenses: cumulative ? d.cumExpenses : d.expenses,
    plotNet: cumulative ? d.cumNet : d.net,
  }));

  if (data.length === 0) {
    return <div className="h-[240px] grid place-items-center text-sm text-muted-foreground">No activity in this range yet.</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <label className="inline-flex items-center gap-1.5">
          <input type="checkbox" checked={cumulative} onChange={(e) => setCumulative(e.target.checked)} />
          Cumulative
        </label>
        <label className="inline-flex items-center gap-1.5">
          <input type="checkbox" checked={showNet} onChange={(e) => setShowNet(e.target.checked)} />
          Show net
        </label>
      </div>
      <div className="w-full aspect-[4/3] sm:aspect-[16/9]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} minTickGap={24} />
            <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v).replace(".00", "")} width={70} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              formatter={(value: number, name: string) => [formatCurrency(value), name]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />
            <Area
              type="monotone"
              dataKey="plotIncome"
              name="Income"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              fill="url(#incomeGradient)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="plotExpenses"
              name="Expenses"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {showNet && (
              <Line
                type="monotone"
                dataKey="plotNet"
                name="Net"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
