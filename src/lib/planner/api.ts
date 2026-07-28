import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PlannedActivityRow } from "@/lib/supabase/database.types";
import { addDays, toDateKey } from "@/lib/planner/date-utils";
import type { CreateActivityInput, UpdateActivityInput, WeekPlan } from "@/lib/planner/types";

type DB = SupabaseClient<Database>;

export async function fetchWeekPlan(
  supabase: DB,
  userId: string,
  weekStart: Date
): Promise<WeekPlan> {
  const weekEnd = addDays(weekStart, 6);
  const startKey = toDateKey(weekStart);
  const endKey = toDateKey(weekEnd);

  const { data: days, error: daysError } = await supabase
    .from("planned_days")
    .select("*")
    .eq("user_id", userId)
    .gte("calendar_date", startKey)
    .lte("calendar_date", endKey);
  if (daysError) throw daysError;

  const dayIds = (days ?? []).map((d) => d.id);

  let activities: PlannedActivityRow[] = [];
  if (dayIds.length > 0) {
    const { data, error } = await supabase
      .from("planned_activities")
      .select("*")
      .in("planned_day_id", dayIds)
      .order("display_order", { ascending: true });
    if (error) throw error;
    activities = data ?? [];
  }

  const plan: WeekPlan = {};
  for (let i = 0; i < 7; i++) {
    const dateKey = toDateKey(addDays(weekStart, i));
    const dayRow = days?.find((d) => d.calendar_date === dateKey);
    plan[dateKey] = {
      dateKey,
      plannedDayId: dayRow?.id ?? null,
      activities: activities.filter((a) => a.planned_day_id === dayRow?.id),
    };
  }
  return plan;
}

export async function ensurePlannedDay(
  supabase: DB,
  userId: string,
  dateKey: string
): Promise<string> {
  const { data: existing, error: selectError } = await supabase
    .from("planned_days")
    .select("id")
    .eq("user_id", userId)
    .eq("calendar_date", dateKey)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from("planned_days")
    .insert({ user_id: userId, calendar_date: dateKey })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return created.id;
}

export async function createActivity(
  supabase: DB,
  userId: string,
  input: CreateActivityInput,
  displayOrder: number
): Promise<PlannedActivityRow> {
  const plannedDayId = await ensurePlannedDay(supabase, userId, input.dateKey);

  const { data, error } = await supabase
    .from("planned_activities")
    .insert({
      planned_day_id: plannedDayId,
      user_id: userId,
      discipline: input.discipline,
      title: input.title,
      target_duration_sec: input.targetDurationSec ?? null,
      target_distance_m: input.targetDistanceM ?? null,
      target_zone: input.targetZone ?? null,
      target_tss: input.targetTss ?? null,
      time_of_day: input.timeOfDay ?? null,
      is_bolted: input.isBolted ?? false,
      bolted_to_activity_id: input.boltedToActivityId ?? null,
      display_order: displayOrder,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateActivity(
  supabase: DB,
  input: UpdateActivityInput
): Promise<PlannedActivityRow> {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.targetDurationSec !== undefined) patch.target_duration_sec = input.targetDurationSec;
  if (input.targetDistanceM !== undefined) patch.target_distance_m = input.targetDistanceM;
  if (input.targetZone !== undefined) patch.target_zone = input.targetZone;
  if (input.targetTss !== undefined) patch.target_tss = input.targetTss;
  if (input.timeOfDay !== undefined) patch.time_of_day = input.timeOfDay;
  if (input.discipline !== undefined) patch.discipline = input.discipline;

  const { data, error } = await supabase
    .from("planned_activities")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteActivity(supabase: DB, id: string): Promise<void> {
  const { error } = await supabase.from("planned_activities").delete().eq("id", id);
  if (error) throw error;
}

export async function moveActivityToDay(
  supabase: DB,
  userId: string,
  activityId: string,
  targetDateKey: string,
  displayOrder: number
): Promise<void> {
  const plannedDayId = await ensurePlannedDay(supabase, userId, targetDateKey);
  const { error } = await supabase
    .from("planned_activities")
    .update({ planned_day_id: plannedDayId, display_order: displayOrder })
    .eq("id", activityId);
  if (error) throw error;
}

export async function reorderActivities(
  supabase: DB,
  updates: { id: string; display_order: number }[]
): Promise<void> {
  await Promise.all(
    updates.map(({ id, display_order }) =>
      supabase.from("planned_activities").update({ display_order }).eq("id", id)
    )
  );
}

// Links `firstId` -> `secondId` as a brick (secondId immediately follows firstId, same day).
export async function linkBrick(
  supabase: DB,
  firstId: string,
  secondId: string,
  brickGroupId: string
): Promise<void> {
  const { error } = await supabase
    .from("planned_activities")
    .update({ is_brick: true, brick_group_id: brickGroupId })
    .in("id", [firstId, secondId]);
  if (error) throw error;
}

export async function unlinkBrick(supabase: DB, brickGroupId: string): Promise<void> {
  const { error } = await supabase
    .from("planned_activities")
    .update({ is_brick: false, brick_group_id: null })
    .eq("brick_group_id", brickGroupId);
  if (error) throw error;
}

export async function unboltActivity(supabase: DB, id: string): Promise<void> {
  const { error } = await supabase
    .from("planned_activities")
    .update({ is_bolted: false, bolted_to_activity_id: null })
    .eq("id", id);
  if (error) throw error;
}
