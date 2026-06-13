import { Shell } from "@/components/dashboard/Shell";
import { OperatorCard } from "@/components/dashboard/OperatorCard";
import { FinancePulseCard } from "@/components/dashboard/FinancePulseCard";
import { KeyBlockersCard } from "@/components/dashboard/KeyBlockersCard";
import { SessionCard } from "@/components/dashboard/SessionCard";
import { HabitsCard } from "@/components/dashboard/HabitsCard";
import { CalendarCard } from "@/components/dashboard/CalendarCard";
import { NutritionCard } from "@/components/dashboard/NutritionCard";
import { GoalsCard } from "@/components/dashboard/GoalsCard";

export default function Home() {
  return (
    <Shell>
      <div className="grid grid-cols-[300px_1fr_260px] gap-2.5 h-full min-h-0 p-2.5">
        {/* Left column */}
        <div className="flex flex-col gap-2.5">
          <OperatorCard />
          <FinancePulseCard />
          <KeyBlockersCard />
        </div>

        {/* Centre column */}
        <div className="flex flex-col gap-2.5">
          <SessionCard />
          <HabitsCard />
          <CalendarCard />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-2.5">
          <GoalsCard />
          <NutritionCard />
        </div>
      </div>
    </Shell>
  );
}
