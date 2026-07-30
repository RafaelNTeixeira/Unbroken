"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DisciplineCompliance } from "@/lib/analytics/types";
import { DISCIPLINE_META } from "@/lib/planner/discipline-meta";

export function ComplianceChart({ data }: { data: DisciplineCompliance[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-foreground-muted">
        No planned or completed sessions in this window yet.
      </p>
    );
  }

  const chartData = data.map((d) => ({
    name: DISCIPLINE_META[d.discipline].label,
    Planned: Math.round(d.plannedHours * 10) / 10,
    Completed: Math.round(d.completedHours * 10) / 10,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "var(--foreground-muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--foreground-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={28}
            label={{
              value: "hours",
              angle: -90,
              position: "insideLeft",
              style: { fill: "var(--foreground-muted)", fontSize: 11 },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="Planned" fill="var(--foreground-muted)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Completed" fill="var(--discipline-bike)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-foreground-muted">
            <th className="pb-1 font-normal">Discipline</th>
            <th className="pb-1 text-right font-normal">Planned sessions</th>
            <th className="pb-1 text-right font-normal">Completed sessions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.discipline} className="border-t border-border">
              <td className="py-1.5 flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: DISCIPLINE_META[d.discipline].colorVar }}
                />
                {DISCIPLINE_META[d.discipline].label}
              </td>
              <td className="py-1.5 text-right text-foreground-muted">{d.plannedCount}</td>
              <td className="py-1.5 text-right">{d.completedCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
