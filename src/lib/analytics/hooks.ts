"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import * as api from "@/lib/analytics/api";

export function useLoadSeries(userId: string | null, windowDays: number) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["analytics-load-series", userId, windowDays],
    queryFn: () => api.fetchLoadSeries(supabase, userId as string, windowDays),
    enabled: Boolean(userId),
  });
}

export function useZoneDistribution(userId: string | null, windowDays: number) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["analytics-zone-distribution", userId, windowDays],
    queryFn: () => api.fetchZoneDistribution(supabase, userId as string, windowDays),
    enabled: Boolean(userId),
  });
}

export function useCompliance(userId: string | null, weeksBack: number) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["analytics-compliance", userId, weeksBack],
    queryFn: () => api.fetchCompliance(supabase, userId as string, weeksBack),
    enabled: Boolean(userId),
  });
}
