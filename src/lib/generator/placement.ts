import { addDays, toDateKey } from "@/lib/planner/date-utils";
import { WEEKDAYS, type PlacementResult, type SlotGroup, type Weekday } from "@/lib/generator/types";

export function placeGroups(
  groups: SlotGroup[],
  weekStart: Date,
  availableDays: Weekday[],
  maxSessionsPerDay: number
): PlacementResult {
  const activeDays = WEEKDAYS.filter((w) => availableDays.includes(w));
  if (activeDays.length === 0) {
    return { placements: [], unplaced: groups };
  }

  const capacityUsed = new Map<Weekday, number>(activeDays.map((d) => [d, 0]));
  const placements: PlacementResult["placements"] = [];
  const unplaced: SlotGroup[] = [];
  let dayPointer = 0;

  for (const group of groups) {
    const need = group.brickPartner ? 2 : 1;
    let placed = false;

    for (let attempt = 0; attempt < activeDays.length; attempt++) {
      const day = activeDays[(dayPointer + attempt) % activeDays.length];
      const used = capacityUsed.get(day) ?? 0;
      if (used + need <= maxSessionsPerDay) {
        capacityUsed.set(day, used + need);
        const weekdayIndex = WEEKDAYS.indexOf(day);
        placements.push({ dateKey: toDateKey(addDays(weekStart, weekdayIndex)), group });
        dayPointer = (dayPointer + attempt + 1) % activeDays.length;
        placed = true;
        break;
      }
    }

    if (!placed) unplaced.push(group);
  }

  return { placements, unplaced };
}
