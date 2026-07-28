import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PlannedActivityRow, TrainingBlockRow } from "@/lib/supabase/database.types";
import { addDays, toDateKey } from "@/lib/planner/date-utils";
import { ensurePlannedDay, fetchWeekPlan } from "@/lib/planner/api";
import { v4 as uuid } from "uuid";
import { computeScaleForWeek, scaleValue, type CloneMesocycleInput } from "@/lib/mesocycle/types";

type DB = SupabaseClient<Database>;

export async function fetchTrainingBlocks(supabase: DB, userId: string): Promise<TrainingBlockRow[]> {
  const { data, error } = await supabase
    .from("training_blocks")
    .select("*")
    .eq("user_id", userId)
    .order("start_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function deleteTrainingBlock(supabase: DB, id: string): Promise<void> {
  // planned_days.training_block_id -> ON DELETE CASCADE removes days + activities for this block.
  const { error } = await supabase.from("training_blocks").delete().eq("id", id);
  if (error) throw error;
}

// Assigns a planned_day (created if needed) to a training block, without disturbing
// activities that may already exist there from before the block existed.
async function assignDayToBlock(
  supabase: DB,
  userId: string,
  dateKey: string,
  trainingBlockId: string
): Promise<string> {
  const dayId = await ensurePlannedDay(supabase, userId, dateKey);
  const { error } = await supabase
    .from("planned_days")
    .update({ training_block_id: trainingBlockId })
    .eq("id", dayId);
  if (error) throw error;
  return dayId;
}

export async function cloneMesocycle(
  supabase: DB,
  userId: string,
  input: CloneMesocycleInput
): Promise<TrainingBlockRow> {
  const basePlan = await fetchWeekPlan(supabase, userId, input.baseWeekStart);
  const endDate = addDays(input.baseWeekStart, input.weekCount * 7 - 1);

  const { data: block, error: blockError } = await supabase
    .from("training_blocks")
    .insert({
      user_id: userId,
      name: input.name,
      start_date: toDateKey(input.baseWeekStart),
      end_date: toDateKey(endDate),
      progression_enabled: input.progressionEnabled,
      progression_config: input.progressionEnabled ? input.progressionConfig : null,
    })
    .select("*")
    .single();
  if (blockError) throw blockError;

  // Deliberately NOT tagging the template week's own days with this block.
  // The template week existed independently before the clone, and deleting
  // this mesocycle later (which cascades) should only remove the *generated*
  // weeks, never the original week the user hand-built.
  for (let weekOffset = 1; weekOffset <= input.weekCount - 1; weekOffset++) {
    const scale = input.progressionEnabled
      ? computeScaleForWeek(weekOffset, input.progressionConfig)
      : 1;

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const sourceDateKey = toDateKey(addDays(input.baseWeekStart, dayIndex));
      const sourceDay = basePlan[sourceDateKey];
      if (!sourceDay || sourceDay.activities.length === 0) continue;

      const targetDateKey = toDateKey(addDays(input.baseWeekStart, weekOffset * 7 + dayIndex));
      const targetDayId = await assignDayToBlock(supabase, userId, targetDateKey, block.id);

      await cloneDayActivities(supabase, userId, sourceDay.activities, targetDayId, scale);
    }
  }

  return block;
}

async function cloneDayActivities(
  supabase: DB,
  userId: string,
  sourceActivities: PlannedActivityRow[],
  targetDayId: string,
  scale: number
): Promise<void> {
  const topLevel = sourceActivities
    .filter((a) => !a.is_bolted)
    .sort((a, b) => a.display_order - b.display_order);
  const boltedByParent = new Map<string, PlannedActivityRow[]>();
  for (const a of sourceActivities) {
    if (a.is_bolted && a.bolted_to_activity_id) {
      const list = boltedByParent.get(a.bolted_to_activity_id) ?? [];
      list.push(a);
      boltedByParent.set(a.bolted_to_activity_id, list);
    }
  }

  const brickGroupRemap = new Map<string, string>();
  const idRemap = new Map<string, string>();

  for (let i = 0; i < topLevel.length; i++) {
    const source = topLevel[i];
    let newBrickGroupId: string | null = null;
    if (source.brick_group_id) {
      if (!brickGroupRemap.has(source.brick_group_id)) {
        brickGroupRemap.set(source.brick_group_id, uuid());
      }
      newBrickGroupId = brickGroupRemap.get(source.brick_group_id)!;
    }

    const { data: inserted, error } = await supabase
      .from("planned_activities")
      .insert({
        planned_day_id: targetDayId,
        user_id: userId,
        discipline: source.discipline,
        title: source.title,
        target_duration_sec: scaleValue(source.target_duration_sec, scale),
        target_distance_m: scaleValue(source.target_distance_m, scale),
        target_zone: source.target_zone,
        target_tss: scaleValue(source.target_tss, scale),
        is_brick: source.is_brick,
        brick_group_id: newBrickGroupId,
        is_bolted: false,
        bolted_to_activity_id: null,
        display_order: i,
        time_of_day: source.time_of_day,
        structure: source.structure,
      })
      .select("id")
      .single();
    if (error) throw error;
    idRemap.set(source.id, inserted.id);
  }

  for (const [parentOldId, children] of boltedByParent) {
    const parentNewId = idRemap.get(parentOldId);
    if (!parentNewId) continue;

    for (const child of children) {
      const { error } = await supabase.from("planned_activities").insert({
        planned_day_id: targetDayId,
        user_id: userId,
        discipline: child.discipline,
        title: child.title,
        target_duration_sec: scaleValue(child.target_duration_sec, scale),
        target_distance_m: scaleValue(child.target_distance_m, scale),
        target_zone: child.target_zone,
        target_tss: scaleValue(child.target_tss, scale),
        is_brick: false,
        brick_group_id: null,
        is_bolted: true,
        bolted_to_activity_id: parentNewId,
        display_order: child.display_order,
        time_of_day: child.time_of_day,
        structure: child.structure,
      });
      if (error) throw error;
    }
  }
}
