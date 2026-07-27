export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="h-2 w-2 rounded-full bg-discipline-swim" />
            <span className="h-2 w-2 rounded-full bg-discipline-bike" />
            <span className="h-2 w-2 rounded-full bg-discipline-run" />
            <span className="ml-1">Unbroken</span>
          </div>
          <p className="mt-1 text-sm text-foreground-muted">
            Your training, your data, $0.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl shadow-black/20">
          {children}
        </div>
      </div>
    </main>
  );
}
