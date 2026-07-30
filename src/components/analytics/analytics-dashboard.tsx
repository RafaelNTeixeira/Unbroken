"use client";

import { useState } from "react";
import { useAuthUserId } from "@/lib/supabase/use-auth-user";
import { useCompliance, useLoadSeries, useZoneDistribution } from "@/lib/analytics/hooks";
import { FitnessChart } from "@/components/analytics/fitness-chart";
import { ZoneDistributionChart } from "@/components/analytics/zone-distribution-chart";
import { ComplianceChart } from "@/components/analytics/compliance-chart";

function PillGroup<T extends number>({
  value,
  options,
  onChange,
  suffix,
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  suffix: string;
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`rounded-lg border px-2.5 py-1 text-xs ${
            value === opt
              ? "border-foreground bg-surface-raised"
              : "border-border text-foreground-muted hover:bg-surface"
          }`}
        >
          {opt}
          {suffix}
        </button>
      ))}
    </div>
  );
}

export function AnalyticsDashboard() {
  const userId = useAuthUserId();
  const [fitnessWindow, setFitnessWindow] = useState<42 | 90 | 180>(90);
  const [zoneWindow, setZoneWindow] = useState<14 | 28 | 56>(28);
  const [complianceWeeks, setComplianceWeeks] = useState<4 | 8 | 12>(4);

  const { data: loadPoints, isLoading: loadingFitness } = useLoadSeries(userId, fitnessWindow);
  const { data: zoneDistribution, isLoading: loadingZones } = useZoneDistribution(userId, zoneWindow);
  const { data: compliance, isLoading: loadingCompliance } = useCompliance(userId, complianceWeeks);

  if (!userId) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Trends from what you&apos;ve logged — the more consistently you log completions, the
          more these mean.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium">Fitness &amp; Fatigue</h2>
            <p className="text-xs text-foreground-muted">
              CTL (42-day load), ATL (7-day load), and Form (TSB = CTL − ATL)
            </p>
          </div>
          <PillGroup value={fitnessWindow} options={[42, 90, 180]} onChange={setFitnessWindow} suffix="d" />
        </div>
        {loadingFitness ? (
          <p className="text-sm text-foreground-muted">Loading…</p>
        ) : (
          <FitnessChart points={loadPoints ?? []} />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium">80/20 Intensity Distribution</h2>
              <p className="text-xs text-foreground-muted">Time by zone bucket</p>
            </div>
            <PillGroup value={zoneWindow} options={[14, 28, 56]} onChange={setZoneWindow} suffix="d" />
          </div>
          {loadingZones ? (
            <p className="text-sm text-foreground-muted">Loading…</p>
          ) : (
            <ZoneDistributionChart
              distribution={zoneDistribution ?? { lowSec: 0, greySec: 0, highSec: 0, unclassifiedSec: 0 }}
            />
          )}
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium">Volume &amp; Frequency Compliance</h2>
              <p className="text-xs text-foreground-muted">Planned vs. completed, by discipline</p>
            </div>
            <PillGroup value={complianceWeeks} options={[4, 8, 12]} onChange={setComplianceWeeks} suffix="w" />
          </div>
          {loadingCompliance ? (
            <p className="text-sm text-foreground-muted">Loading…</p>
          ) : (
            <ComplianceChart data={compliance ?? []} />
          )}
        </section>
      </div>

      <p className="text-xs text-foreground-muted">
        Fitness/fatigue and zone numbers are estimates derived from logged duration, discipline,
        and (when available) power or matched target zone — not a substitute for a validated TSS
        model from a power meter or lab-tested thresholds. See the README for exactly how these
        are computed.
      </p>
    </div>
  );
}
