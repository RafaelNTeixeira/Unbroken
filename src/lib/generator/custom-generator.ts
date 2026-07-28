import type { Discipline } from "@/lib/supabase/database.types";
import type { GeneratorConstraints, SlotGroup } from "@/lib/generator/types";

// Simplified but transparent heuristic: a typical triathlon week splits volume
// roughly 20% swim / 40% bike / 30% run / 10% strength. Each discipline has a
// typical single-session length; dividing the discipline's target minutes by
// that length gives a session count, which is then capped by how much room
// the available days actually have. The first session of swim/bike/run each
// week is nudged into a higher zone (quality), the rest stay aerobic — a
// rough stand-in for real periodization without pretending to be a coach.
const DISCIPLINE_SHARE: Record<"swim" | "bike" | "run" | "strength", number> = {
  swim: 0.2,
  bike: 0.4,
  run: 0.3,
  strength: 0.1,
};

const TYPICAL_SESSION_MIN: Record<"swim" | "bike" | "run" | "strength", number> = {
  swim: 55,
  bike: 75,
  run: 45,
  strength: 30,
};

export function buildCustomGroups(constraints: GeneratorConstraints): SlotGroup[] {
  const totalCapacity = constraints.availableDays.length * constraints.maxSessionsPerDay;
  const totalMinutes = constraints.targetWeeklyHours * 60;

  const rawCounts = (Object.keys(DISCIPLINE_SHARE) as (keyof typeof DISCIPLINE_SHARE)[]).map(
    (discipline) => {
      const minutes = totalMinutes * DISCIPLINE_SHARE[discipline];
      const count = Math.max(0, Math.round(minutes / TYPICAL_SESSION_MIN[discipline]));
      return { discipline, count, minutes };
    }
  );

  // Scale down proportionally if the naive counts would overflow the week's capacity.
  const totalRaw = rawCounts.reduce((s, r) => s + r.count, 0);
  const scale = totalRaw > totalCapacity && totalRaw > 0 ? totalCapacity / totalRaw : 1;

  const groups: SlotGroup[] = [];
  let groupIndex = 0;

  for (const { discipline, count } of rawCounts) {
    const finalCount = Math.max(0, Math.round(count * scale));
    const avgDurationSec = TYPICAL_SESSION_MIN[discipline] * 60;

    for (let i = 0; i < finalCount; i++) {
      const isQualitySession = i === 0 && discipline !== "strength";
      groups.push({
        id: `custom-${discipline}-${groupIndex++}`,
        primary: {
          discipline: discipline as Discipline,
          title: `${capitalize(discipline)} — ${
            isQualitySession ? "Quality" : discipline === "strength" ? "Core & Stability" : "Aerobic"
          }`,
          durationSec: avgDurationSec,
          targetZone: discipline === "strength" ? undefined : isQualitySession ? "z4" : "z2",
        },
      });
    }
  }

  // Interleave by discipline (swim, bike, run, strength, swim, bike, ...) instead of
  // dumping all of one discipline in a row, so the placement engine spreads variety
  // across the week rather than stacking three runs before touching the bike.
  return interleaveByDiscipline(groups);
}

function interleaveByDiscipline(groups: SlotGroup[]): SlotGroup[] {
  const byDiscipline = new Map<Discipline, SlotGroup[]>();
  for (const g of groups) {
    const list = byDiscipline.get(g.primary.discipline) ?? [];
    list.push(g);
    byDiscipline.set(g.primary.discipline, list);
  }

  const buckets = Array.from(byDiscipline.values());
  const result: SlotGroup[] = [];
  let remaining = groups.length;
  let cursor = 0;
  while (remaining > 0) {
    const bucket = buckets[cursor % buckets.length];
    if (bucket.length > 0) {
      result.push(bucket.shift()!);
      remaining--;
    }
    cursor++;
  }
  return result;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
