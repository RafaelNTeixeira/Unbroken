import type { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuid } from "uuid";
import type { Database } from "@/lib/supabase/database.types";
import { addDays, toDateKey } from "@/lib/planner/date-utils";
import { ensurePlannedDay } from "@/lib/planner/api";
import type { Placement } from "@/lib/generator/types";

type DB = SupabaseClient<Database>;

export async function clearWeek(supabase: DB, userId: string, weekStart: Date): Promise<void> {
  const weekEnd = addDays(weekStart, 6);
  const { data: days, error } = await supabase
    .from("planned_days")
    .select("id")
    .eq("user_id", userId)
    .gte("calendar_date", toDateKey(weekStart))
    .lte("calendar_date", toDateKey(weekEnd));
  if (error) throw error;

  const dayIds = (days ?? []).map((d) => d.id);
  if (dayIds.length === 0) return;

  const { error: deleteError } = await supabase
    .from("planned_activities")
    .delete()
    .in("planned_day_id", dayIds);
  if (deleteError) throw deleteError;
}

export async function persistPlacements(
  supabase: DB,
  userId: string,
  placements: Placement[]
): Promise<void> {
  // Track how many top-level sessions we've already written per day so
  // multiple groups landing on the same day stack in order.
  const displayOrderByDay = new Map<string, number>();

  for (const { dateKey, group } of placements) {
    const dayId = await ensurePlannedDay(supabase, userId, dateKey);
    const startOrder = displayOrderByDay.get(dateKey) ?? 0;

    const brickGroupId = group.brickPartner ? uuid() : null;

    const { data: primaryRow, error: primaryError } = await supabase
      .from("planned_activities")
      .insert({
        planned_day_id: dayId,
        user_id: userId,
        discipline: group.primary.discipline,
        title: group.primary.title,
        target_duration_sec: group.primary.durationSec,
        target_distance_m: group.primary.distanceM ?? null,
        target_zone: group.primary.targetZone ?? null,
        target_tss: group.primary.targetTss ?? null,
        is_brick: Boolean(brickGroupId),
        brick_group_id: brickGroupId,
        display_order: startOrder,
      })
      .select("id")
      .single();
    if (primaryError) throw primaryError;

    let nextOrder = startOrder + 1;

    if (group.brickPartner) {
      const { error: brickError } = await supabase.from("planned_activities").insert({
        planned_day_id: dayId,
        user_id: userId,
        discipline: group.brickPartner.discipline,
        title: group.brickPartner.title,
        target_duration_sec: group.brickPartner.durationSec,
        target_distance_m: group.brickPartner.distanceM ?? null,
        target_zone: group.brickPartner.targetZone ?? null,
        target_tss: group.brickPartner.targetTss ?? null,
        is_brick: true,
        brick_group_id: brickGroupId,
        display_order: nextOrder,
      });
      if (brickError) throw brickError;
      nextOrder += 1;
    }

    for (const child of group.bolted ?? []) {
      const { error: boltError } = await supabase.from("planned_activities").insert({
        planned_day_id: dayId,
        user_id: userId,
        discipline: child.discipline,
        title: child.title,
        target_duration_sec: child.durationSec,
        target_distance_m: child.distanceM ?? null,
        target_zone: child.targetZone ?? null,
        target_tss: child.targetTss ?? null,
        is_bolted: true,
        bolted_to_activity_id: primaryRow.id,
        display_order: nextOrder,
      });
      if (boltError) throw boltError;
    }

    displayOrderByDay.set(dateKey, nextOrder);
  }
}
