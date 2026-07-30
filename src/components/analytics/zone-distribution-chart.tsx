"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ZoneDistribution } from "@/lib/analytics/types";
import { formatDuration } from "@/lib/planner/date-utils";

export function ZoneDistributionChart({ distribution }: { distribution: ZoneDistribution }) {
  const { lowSec, greySec, highSec, unclassifiedSec } = distribution;
  const classifiedTotal = lowSec + greySec + highSec;

  if (classifiedTotal === 0) {
    return (
      <p className="text-sm text-foreground-muted">
        No zone data yet. Zone distribution only counts sessions that matched a planned session
        with a target zone set — log completions against planned sessions (rather than only
        ad-hoc entries) to populate this.
      </p>
    );
  }

  const lowPct = Math.round((lowSec / classifiedTotal) * 100);
  const greyPct = Math.round((greySec / classifiedTotal) * 100);
  const highPct = 100 - lowPct - greyPct;

  const data = [
    { name: "Low (Z1–Z2)", value: lowSec, color: "var(--zone-z2)" },
    { name: "Grey zone (Z3)", value: greySec, color: "var(--zone-z3)" },
    { name: "Threshold+ (Z4–Z5)", value: highSec, color: "var(--zone-z5)" },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width={140} height={140}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={38} outerRadius={62} paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [formatDuration(Number(value) || 0), String(name)]}
            contentStyle={{
              backgroundColor: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex-1 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-foreground-muted">
            <span className="h-2 w-2 rounded-full bg-zone-z2" /> Low (Z1–Z2)
          </span>
          <span>{lowPct}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-foreground-muted">
            <span className="h-2 w-2 rounded-full bg-zone-z3" /> Grey zone (Z3)
          </span>
          <span className={greyPct > 15 ? "text-zone-z3" : ""}>{greyPct}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-foreground-muted">
            <span className="h-2 w-2 rounded-full bg-zone-z5" /> Threshold+ (Z4–Z5)
          </span>
          <span>{highPct}%</span>
        </div>

        <p className="pt-1 text-xs text-foreground-muted">
          80/20 target: ~80% low-intensity, ~20% threshold and above. You&apos;re at{" "}
          <strong className="text-foreground">{lowPct}/{100 - lowPct}</strong>.
          {greyPct > 15 && " A high grey-zone share often means easy days aren't easy enough."}
        </p>

        {unclassifiedSec > 0 && (
          <p className="text-xs text-foreground-muted">
            +{formatDuration(unclassifiedSec)} logged without a matched zone, excluded above.
          </p>
        )}
      </div>
    </div>
  );
}
