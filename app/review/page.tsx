import { Shell } from "@/components/dashboard/Shell";
import { ReviewDashboard } from "@/components/review/ReviewDashboard";
import { getDailyLog } from "@/lib/data/getDailyLog";
import { getTasks } from "@/lib/data/tasks";

function todayDate() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: process.env.USER_TIMEZONE ?? "UTC",
  });
}

export default async function ReviewPage() {
  const today = todayDate();
  const [log, tasks] = await Promise.all([
    getDailyLog("cade", today),
    getTasks("open"),
  ]);

  return (
    <Shell>
      <ReviewDashboard
        date={today}
        initialLog={log}
        openTasks={tasks}
      />
    </Shell>
  );
}
