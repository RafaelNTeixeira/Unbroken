"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h1 className="text-base font-medium">Log in</h1>

      <label className="block text-sm">
        <span className="mb-1 block text-foreground-muted">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm outline-none focus-visible:outline-2"
          autoComplete="email"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-foreground-muted">Password</span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm outline-none focus-visible:outline-2"
          autoComplete="current-password"
        />
      </label>

      {error && <p className="text-sm text-discipline-run">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-discipline-bike px-3 py-2 text-sm font-medium text-black disabled:opacity-60"
      >
        {loading ? "Logging in…" : "Log in"}
      </button>

      <p className="text-center text-sm text-foreground-muted">
        No account yet?{" "}
        <Link href="/sign-up" className="text-foreground underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
