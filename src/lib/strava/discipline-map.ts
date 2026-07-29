import type { Discipline } from "@/lib/supabase/database.types";

// Kept in sync manually with the copy inside
// supabase/functions/strava-webhook/index.ts — Deno Edge Functions can't
// import from src/, so this logic necessarily lives in two places.
export function mapStravaSportType(stravaType: string): Discipline {
  const t = stravaType.toLowerCase();
  if (t.includes("swim")) return "swim";
  if (t.includes("ride") || t.includes("bike") || t.includes("cycl")) return "bike";
  if (t.includes("run")) return "run";
  if (
    t.includes("weight") ||
    t.includes("workout") ||
    t.includes("crossfit") ||
    t.includes("strength")
  )
    return "strength";
  if (t.includes("yoga") || t.includes("stretch") || t.includes("mobility")) return "mobility";
  return "other";
}
