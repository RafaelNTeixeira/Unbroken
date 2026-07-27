"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarRange,
  Sparkles,
  LineChart,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/planner", label: "Planner", icon: CalendarRange },
  { href: "/blueprint", label: "Blueprint", icon: Sparkles },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-surface md:flex md:flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="h-2 w-2 rounded-full bg-discipline-swim" />
        <span className="h-2 w-2 rounded-full bg-discipline-bike" />
        <span className="h-2 w-2 rounded-full bg-discipline-run" />
        <span className="ml-1 text-sm font-semibold tracking-tight">Unbroken</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-surface-raised text-foreground"
                  : "text-foreground-muted hover:bg-surface-raised hover:text-foreground"
              }`}
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 text-xs text-foreground-muted">
        Zero-cost tier · v0.1
      </div>
    </aside>
  );
}
