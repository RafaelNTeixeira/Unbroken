"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LoadPoint } from "@/lib/analytics/types";
import { parseDateKey } from "@/lib/planner/date-utils";

function formatTick(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function FitnessChart({ points }: { points: LoadPoint[] }) {
  const data = points.map((p) => ({
    ...p,
    label: formatTick(p.dateKey),
  }));

  const hasAnyLoad = points.some((p) => p.load > 0);

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--foreground-muted)", fontSize: 11 }}
            interval={Math.max(0, Math.floor(data.length / 6))}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--foreground-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <ReferenceLine y={0} stroke="var(--border)" />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--foreground)" }}
          />
          <Area
            type="monotone"
            dataKey="tsb"
            name="Form (TSB)"
            fill="var(--zone-z2)"
            fillOpacity={0.12}
            stroke="var(--zone-z2)"
            strokeWidth={1.5}
          />
          <Line
            type="monotone"
            dataKey="ctl"
            name="Fitness (CTL)"
            stroke="var(--discipline-bike)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="atl"
            name="Fatigue (ATL)"
            stroke="var(--discipline-run)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-2 flex gap-4 text-xs text-foreground-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-discipline-bike" /> Fitness (CTL)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-discipline-run" /> Fatigue (ATL)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-zone-z2" /> Form (TSB)
        </span>
      </div>

      {!hasAnyLoad && (
        <p className="mt-3 text-sm text-foreground-muted">
          No logged sessions in this window yet — CTL/ATL will build up as you log completed
          workouts. With no training history to seed from, the chart necessarily starts at zero
          and ramps up, rather than reflecting fitness built before you started using this app.
        </p>
      )}
    </div>
  );
}
