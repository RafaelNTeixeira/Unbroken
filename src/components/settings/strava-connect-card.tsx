"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const STRAVA_STATUS_MESSAGES: Record<string, { text: string; tone: "success" | "error" }> = {
  connected: { text: "Strava connected.", tone: "success" },
  denied: { text: "Strava authorization was cancelled.", tone: "error" },
  error: { text: "Something went wrong connecting Strava — try again.", tone: "error" },
  misconfigured: {
    text: "Strava isn't fully configured yet — check STRAVA_TOKEN_ENCRYPTION_KEY on the server.",
    tone: "error",
  },
};

export function StravaConnectCard({
  userId,
  connected,
  athleteId,
}: {
  userId: string;
  connected: boolean;
  athleteId: number | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [disconnecting, setDisconnecting] = useState(false);

  const status = searchParams.get("strava");
  const [message] = useState(status ? STRAVA_STATUS_MESSAGES[status] : null);

  useEffect(() => {
    if (status) {
      // Clean the query param out of the URL after reading it once.
      router.replace("/settings");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when the status param first appears
  }, [status]);

  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI;
  const authorizeUrl =
    clientId && redirectUri
      ? `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&response_type=code&approval_prompt=auto&scope=activity:read_all`
      : null;

  async function handleDisconnect() {
    setDisconnecting(true);
    await supabase.rpc("clear_strava_tokens", { p_user_id: userId });
    setDisconnecting(false);
    router.refresh();
  }

  return (
    <div className="max-w-lg rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-sm font-medium">Strava connection</h2>

      {connected ? (
        <>
          <p className="mt-1 text-sm text-discipline-mobility">
            Connected{athleteId ? ` — athlete #${athleteId}` : ""}
          </p>
          <p className="mt-1 text-sm text-foreground-muted">
            New activities you upload to Strava are ingested automatically and matched against
            your plan.
          </p>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="mt-3 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground-muted hover:bg-surface-raised hover:text-discipline-run disabled:opacity-50"
          >
            {disconnecting ? "Disconnecting…" : "Disconnect Strava"}
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-foreground-muted">
            Connect Strava to automatically ingest and reconcile your workouts against the plan.
          </p>
          {authorizeUrl ? (
            <a
              href={authorizeUrl}
              className="mt-3 inline-block rounded-lg bg-discipline-bike px-3 py-1.5 text-sm font-medium text-black"
            >
              Connect Strava
            </a>
          ) : (
            <p className="mt-3 text-sm text-discipline-run">
              Missing NEXT_PUBLIC_STRAVA_CLIENT_ID / NEXT_PUBLIC_STRAVA_REDIRECT_URI — see
              SETUP.md.
            </p>
          )}
        </>
      )}

      {message && (
        <p
          className={`mt-3 text-sm ${
            message.tone === "success" ? "text-discipline-mobility" : "text-discipline-run"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
