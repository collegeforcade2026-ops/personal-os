import { Shell } from "@/components/dashboard/Shell";
import { CRMDashboard } from "@/components/crm/CRMDashboard";
import { getTasks } from "@/lib/data/tasks";

export default async function CRMPage() {
  const tasks = await getTasks("open");
  return (
    <Shell>
      <CRMDashboard initialTasks={tasks} />
    </Shell>
  );
}
