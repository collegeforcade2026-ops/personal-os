import { Panel } from "./Panel";
import { getOpenTasks } from "@/lib/data/getTasks";

const URGENCY_LABEL: Record<string, { label: string; color: string }> = {
  today:      { label: "HOT",  color: "var(--danger)" },
  this_week:  { label: "WARM", color: "var(--warn)" },
  this_month: { label: "COOL", color: "var(--accent)" },
  someday:    { label: "ICE",  color: "var(--ink-3)" },
};

export async function KeyBlockersCard() {
  const tasks = await getOpenTasks(5);

  return (
    <Panel label="KEY BLOCKERS" labelNum="03" action={
      <span className="text-[10px] font-mono text-[var(--ink-2)]">{tasks.length} OPEN</span>
    }>
      {tasks.length === 0 ? (
        <p className="text-xs text-[var(--ink-3)] italic">No open tasks — send one via Telegram.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => {
            const u = URGENCY_LABEL[task.urgency] ?? URGENCY_LABEL.someday;
            return (
              <div key={task.id} className="flex items-start gap-2">
                <span
                  className="text-[9px] font-mono tracking-widest shrink-0 mt-0.5 px-1 py-0.5 rounded border"
                  style={{ color: u.color, borderColor: u.color }}
                >
                  {u.label}
                </span>
                <span className="text-xs text-[var(--ink-1)] leading-snug flex-1">{task.title}</span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
