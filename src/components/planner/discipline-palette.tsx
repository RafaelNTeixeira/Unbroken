"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { DISCIPLINES, DISCIPLINE_META } from "@/lib/planner/discipline-meta";

function PaletteBlock({ discipline }: { discipline: (typeof DISCIPLINES)[number] }) {
  const meta = DISCIPLINE_META[discipline];
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: `palette-${discipline}`,
    data: { type: "palette", discipline },
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      className={`flex w-full items-center gap-2.5 rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-left text-sm transition-opacity ${
        isDragging ? "z-40 opacity-90 shadow-lg" : "hover:border-foreground-muted"
      }`}
      style={{ touchAction: "none", transform: CSS.Translate.toString(transform) }}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: meta.colorVar }}
      />
      {meta.label}
    </button>
  );
}

export function DisciplinePalette() {
  return (
    <div className="w-full shrink-0 md:w-44">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-muted">
        Drag onto a day
      </h2>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
        {DISCIPLINES.map((d) => (
          <PaletteBlock key={d} discipline={d} />
        ))}
      </div>
    </div>
  );
}
