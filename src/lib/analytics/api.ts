import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Discipline, TrainingZone } from "@/lib/supabase/database.types";
import { addDays, toDateKey } from "@/lib/planner/date-utils";
import { DISCIPLINES } from "@/lib/planner/discipline-meta";
import {
  estimateSessionLoad,
  zoneBucket,
  type DisciplineCompliance,
  type LoadPoint,
  type ZoneDistribution,
} from "@/lib/analytics/types";

type DB = SupabaseClient<Database>;

async function getFtp(supabase: DB, userId: string): Promise<number | null> {
  const { data } = await supabase.from("users").select("ftp_watts").eq("id", userId).maybeSingle();
  return data?.ftp_watts ?? null;
}

// Maps completed_activity id -> the target_zone of whatever planned session
// it matched (via reconciliation_logs), when it matched one at all.
async function getMatchedZones(
  supabase: DB,
  userId: string,
  completedIds: string[]
): Promise<Map<string, TrainingZone | null>> {
  const map = new Map<string, TrainingZone | null>();
  if (completedIds.length === 0) return map;

  const { data: logs } = await supabase
    .from("reconciliation_logs")
    .select("completed_activity_id, planned_activity_id")
    .eq("user_id", userId)
    .eq("status", "matched")
    .in("completed_activity_id", completedIds);

  const plannedIds = (logs ?? []).map((l) => l.planned_activity_id).filter((id): id is string => Boolean(id));
  if (plannedIds.length === 0) return map;

  const { data: planned } = await supabase
    .from("planned_activities")
    .select("id, target_zone")
    .in("id", plannedIds);
  const zoneByPlannedId = new Map((planned ?? []).map((p) => [p.id, p.target_zone]));

  for (const log of logs ?? []) {
    if (log.completed_activity_id) {
      map.set(
        log.completed_activity_id,
        log.planned_activity_id ? zoneByPlannedId.get(log.planned_activity_id) ?? null : null
      );
    }
  }
  return map;
}

export async function fetchLoadSeries(
  supabase: DB,
  userId: string,
  windowDays: number
): Promise<LoadPoint[]> {
  const start = addDays(new Date(), -windowDays);
  const ftp = await getFtp(supabase, userId);

  const { data: completed } = await supabase
    .from("completed_activities")
    .select("*")
    .eq("user_id", userId)
    .gte("started_at", start.toISOString())
    .order("started_at", { ascending: true });

  const rows = completed ?? [];
  const zoneByCompletedId = await getMatchedZones(
    supabase,
    userId,
    rows.map((r) => r.id)
  );

  const loadByDate = new Map<string, number>();
  for (const row of rows) {
    const dateKey = row.started_at.slice(0, 10);
    const load = estimateSessionLoad(
      row.moving_time_sec,
      row.average_watts,
      ftp,
      row.discipline,
      zoneByCompletedId.get(row.id) ?? null
    );
    loadByDate.set(dateKey, (loadByDate.get(dateKey) ?? 0) + load);
  }

  const points: LoadPoint[] = [];
  let ctl = 0;
  let atl = 0;
  for (let i = 0; i <= windowDays; i++) {
    const date = addDays(start, i);
    const dateKey = toDateKey(date);
    const tsb = ctl - atl; // form entering the day, before today's load is applied
    const todayLoad = loadByDate.get(dateKey) ?? 0;
    ctl = ctl + (todayLoad - ctl) / 42;
    atl = atl + (todayLoad - atl) / 7;
    points.push({ dateKey, load: todayLoad, ctl, atl, tsb });
  }
  return points;
}

export async function fetchZoneDistribution(
  supabase: DB,
  userId: string,
  windowDays: number
): Promise<ZoneDistribution> {
  const start = addDays(new Date(), -windowDays);

  const { data: completed } = await supabase
    .from("completed_activities")
    .select("*")
    .eq("user_id", userId)
    .gte("started_at", start.toISOString());

  const rows = completed ?? [];
  const zoneByCompletedId = await getMatchedZones(
    supabase,
    userId,
    rows.map((r) => r.id)
  );

  const result: ZoneDistribution = { lowSec: 0, greySec: 0, highSec: 0, unclassifiedSec: 0 };
  for (const row of rows) {
    const sec = row.moving_time_sec ?? 0;
    const zone = zoneByCompletedId.get(row.id);
    if (!zone) {
      result.unclassifiedSec += sec;
      continue;
    }
    const bucket = zoneBucket(zone);
    if (bucket === "low") result.lowSec += sec;
    else if (bucket === "grey") result.greySec += sec;
    else result.highSec += sec;
  }
  return result;
}

export async function fetchCompliance(
  supabase: DB,
  userId: string,
  weeksBack: number
): Promise<DisciplineCompliance[]> {
  const start = addDays(new Date(), -weeksBack * 7);
  const startKey = toDateKey(start);

  const { data: days } = await supabase
    .from("planned_days")
    .select("id")
    .eq("user_id", userId)
    .gte("calendar_date", startKey);
  const dayIds = (days ?? []).map((d) => d.id);

  const plannedByDiscipline = new Map<Discipline, { hours: number; count: number }>();
  if (dayIds.length > 0) {
    const { data: planned } = await supabase
      .from("planned_activities")
      .select("discipline, target_duration_sec")
      .in("planned_day_id", dayIds)
      .eq("is_bolted", false);
    for (const p of planned ?? []) {
      const entry = plannedByDiscipline.get(p.discipline) ?? { hours: 0, count: 0 };
      entry.hours += (p.target_duration_sec ?? 0) / 3600;
      entry.count += 1;
      plannedByDiscipline.set(p.discipline, entry);
    }
  }

  const { data: completed } = await supabase
    .from("completed_activities")
    .select("discipline, moving_time_sec")
    .eq("user_id", userId)
    .gte("started_at", start.toISOString());

  const completedByDiscipline = new Map<Discipline, { hours: number; count: number }>();
  for (const c of completed ?? []) {
    const entry = completedByDiscipline.get(c.discipline) ?? { hours: 0, count: 0 };
    entry.hours += (c.moving_time_sec ?? 0) / 3600;
    entry.count += 1;
    completedByDiscipline.set(c.discipline, entry);
  }

  return DISCIPLINES.map((discipline) => ({
    discipline,
    plannedHours: plannedByDiscipline.get(discipline)?.hours ?? 0,
    completedHours: completedByDiscipline.get(discipline)?.hours ?? 0,
    plannedCount: plannedByDiscipline.get(discipline)?.count ?? 0,
    completedCount: completedByDiscipline.get(discipline)?.count ?? 0,
  })).filter((d) => d.plannedHours > 0 || d.completedHours > 0);
}
