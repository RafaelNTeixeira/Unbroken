import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Never import this from a Client Component — the service role key must
// never reach the browser. Used only in Route Handlers / Server Actions
// for operations that legitimately need to bypass RLS (here: writing the
// encrypted Strava tokens via the save_strava_tokens RPC).
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
