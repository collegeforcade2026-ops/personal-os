import { Panel } from "./Panel";
import { getOpenTasks } from "@/lib/data/getTasks";

export async function KeyBlockersCard() {
  const tasks = await getOpenTasks(5);

  return (
    <Panel label="KEY BLOCKERS" labelNum="06" action={
      <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--ink-2)]">
        <span>{tasks.length} ACTIVE</span>
        <span className="text-[var(--accent)] cursor-pointer hover:text-[var(--ink-0)] transition-colors">VIEW ALL</span>
      </div>
    }>
      {tasks.length === 0 ? (
        <p className="text-xs text-[var(--ink-3)] italic">No open tasks — send one via Telegram.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => {
            const urgency = task.urgency;
            const tagClass =
              urgency === "today"      ? "tag-hot" :
              urgency === "this_week"  ? "tag-warm" :
              urgency === "this_month" ? "tag-cool" : "tag-cool";
            const tagLabel =
              urgency === "today"     ? "HOT" :
              urgency === "this_week" ? "WARM" :
              urgency === "this_month"? "COOL" : "ICE";

            return (
              <div key={task.id} className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--ink-1)] leading-snug truncate">{task.title}</p>
                  <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase mt-0.5">
                    OWNER YOU · {task.urgency.replace("_", " ").toUpperCase()}
                  </p>
                </div>
                <span className={`text-[9px] font-mono rounded px-1.5 py-0.5 shrink-0 mt-0.5 ${tagClass}`}>
                  {tagLabel}
                </span>
              </div>
            );
          })}

          <p className="text-[10px] font-mono text-[var(--ink-3)] text-center pt-1 cursor-pointer hover:text-[var(--ink-2)] transition-colors">
            + MORE · VIEW ALL
          </p>
        </div>
      )}
    </Panel>
  );
}
