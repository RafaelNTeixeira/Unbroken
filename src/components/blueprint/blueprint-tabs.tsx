"use client";

import { useState } from "react";
import { MesocyclePanel } from "@/components/blueprint/mesocycle-panel";
import { GeneratorPanel } from "@/components/blueprint/generator-panel";

export function BlueprintTabs() {
  const [tab, setTab] = useState<"clone" | "generate">("generate");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Blueprint</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Generate a week from scratch, apply the Ironman baseline, or clone a week you&apos;ve
          already built into a longer mesocycle.
        </p>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setTab("generate")}
          className={`border-b-2 px-3 py-2 text-sm ${
            tab === "generate"
              ? "border-discipline-bike text-foreground"
              : "border-transparent text-foreground-muted hover:text-foreground"
          }`}
        >
          Generate a week
        </button>
        <button
          onClick={() => setTab("clone")}
          className={`border-b-2 px-3 py-2 text-sm ${
            tab === "clone"
              ? "border-discipline-bike text-foreground"
              : "border-transparent text-foreground-muted hover:text-foreground"
          }`}
        >
          Clone into a mesocycle
        </button>
      </div>

      {tab === "generate" ? <GeneratorPanel /> : <MesocyclePanel />}
    </div>
  );
}
