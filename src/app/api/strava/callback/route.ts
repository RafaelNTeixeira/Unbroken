import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  athlete: { id: number };
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/settings?strava=denied`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/settings?strava=error`);
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${origin}/settings?strava=error`);
  }

  const tokens: StravaTokenResponse = await tokenRes.json();
  const encryptionKey = process.env.STRAVA_TOKEN_ENCRYPTION_KEY;
  if (!encryptionKey) {
    return NextResponse.redirect(`${origin}/settings?strava=misconfigured`);
  }

  const admin = createServiceRoleClient();
  const { error: rpcError } = await admin.rpc("save_strava_tokens", {
    p_user_id: authData.user.id,
    p_athlete_id: tokens.athlete.id,
    p_access_token: tokens.access_token,
    p_refresh_token: tokens.refresh_token,
    p_expires_at: new Date(tokens.expires_at * 1000).toISOString(),
    p_encryption_key: encryptionKey,
  });

  if (rpcError) {
    return NextResponse.redirect(`${origin}/settings?strava=error`);
  }

  return NextResponse.redirect(`${origin}/settings?strava=connected`);
}
