import { CalendarRange } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export default function PlannerPage() {
  return (
    <ComingSoon
      icon={CalendarRange}
      title="Weekly Planner"
      phase="Phase 2"
      description="Drag-and-drop day builder with unbounded sessions per day, brick linking, and bolted sessions."
    />
  );
}
