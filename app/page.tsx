import { Shell } from "@/components/dashboard/Shell";
import { OperatorCard } from "@/components/dashboard/OperatorCard";
import { FinancePulseCard } from "@/components/dashboard/FinancePulseCard";
import { KeyBlockersCard } from "@/components/dashboard/KeyBlockersCard";
import { SessionCard } from "@/components/dashboard/SessionCard";
import { HabitsCard } from "@/components/dashboard/HabitsCard";
import { CalendarCard } from "@/components/dashboard/CalendarCard";
import { NutritionCard } from "@/components/dashboard/NutritionCard";

export default function Home() {
  return (
    <Shell>
      <div className="grid grid-cols-[280px_1fr_280px] gap-3 h-full min-h-0">
        {/* Left column */}
        <div className="flex flex-col gap-3">
          <OperatorCard />
          <FinancePulseCard />
          <KeyBlockersCard />
        </div>

        {/* Centre column */}
        <div className="flex flex-col gap-3">
          <SessionCard />
          <HabitsCard />
          <CalendarCard />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3">
          <NutritionCard />
        </div>
      </div>
    </Shell>
  );
}
