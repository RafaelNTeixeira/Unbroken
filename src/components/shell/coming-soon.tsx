import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  icon: Icon,
  title,
  phase,
  description,
}: {
  icon: LucideIcon;
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface">
        <Icon size={22} className="text-foreground-muted" />
      </div>
      <h2 className="text-base font-medium">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-foreground-muted">{description}</p>
      <span className="mt-4 rounded-full border border-border px-3 py-1 text-xs text-foreground-muted">
        {phase}
      </span>
    </div>
  );
}
