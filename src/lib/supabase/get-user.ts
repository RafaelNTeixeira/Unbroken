import { createClient } from "@/lib/supabase/server";
import type { UserRow } from "@/lib/supabase/database.types";

export async function getAuthUserAndProfile(): Promise<{
  authUserId: string | null;
  profile: UserRow | null;
}> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { authUserId: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authData.user.id)
    .single();

  return { authUserId: authData.user.id, profile: profile as UserRow | null };
}
