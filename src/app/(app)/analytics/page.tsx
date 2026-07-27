import { LineChart } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";

export default function AnalyticsPage() {
  return (
    <ComingSoon
      icon={LineChart}
      title="Athlete Evolution Dashboard"
      phase="Phase 6"
      description="80/20 intensity distribution, planned-vs-completed compliance, and CTL/ATL/TSB trend charts."
    />
  );
}
