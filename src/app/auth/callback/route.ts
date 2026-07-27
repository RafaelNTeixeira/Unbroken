import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the Supabase email-confirmation / magic-link redirect.
// Strava's OAuth callback is separate — see /api/strava/callback, added in Phase 5.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
