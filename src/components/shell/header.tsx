"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function Header() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-end border-b border-border bg-background px-4 py-3 md:px-8">
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-foreground-muted hover:bg-surface hover:text-foreground"
      >
        <LogOut size={15} />
        Sign out
      </button>
    </header>
  );
}
