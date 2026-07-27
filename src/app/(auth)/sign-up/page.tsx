"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="space-y-2 text-center">
        <h1 className="text-base font-medium">Check your email</h1>
        <p className="text-sm text-foreground-muted">
          We sent a confirmation link to <span className="text-foreground">{email}</span>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h1 className="text-base font-medium">Create your account</h1>

      <label className="block text-sm">
        <span className="mb-1 block text-foreground-muted">Name</span>
        <input
          type="text"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm outline-none focus-visible:outline-2"
          autoComplete="name"
        />
      </label>

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
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm outline-none focus-visible:outline-2"
          autoComplete="new-password"
        />
      </label>

      {error && <p className="text-sm text-discipline-run">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-discipline-bike px-3 py-2 text-sm font-medium text-black disabled:opacity-60"
      >
        {loading ? "Creating account…" : "Sign up"}
      </button>

      <p className="text-center text-sm text-foreground-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
