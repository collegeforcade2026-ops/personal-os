import Link from "next/link";
import { Panel } from "./Panel";
import { getTasks } from "@/lib/data/tasks";

export async function KeyBlockersCard() {
  const allTasks = await getTasks("open");
  const urgencyRank: Record<string, number> = { today: 0, "this-week": 1, "this-month": 2, someday: 3 };
  const tasks = allTasks
    .sort((a, b) => {
      if (a.key !== b.key) return a.key ? -1 : 1;
      return (urgencyRank[a.urgency] ?? 3) - (urgencyRank[b.urgency] ?? 3);
    })
    .slice(0, 5);

  return (
    <Panel label="KEY BLOCKERS" labelNum="06" action={
      <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--ink-2)]">
        <span>{allTasks.length} ACTIVE</span>
        <Link href="/crm" className="text-[var(--accent)] hover:text-[var(--ink-0)] transition-colors">VIEW ALL</Link>
      </div>
    }>
      {tasks.length === 0 ? (
        <p className="text-xs text-[var(--ink-3)] italic">No open tasks — add one in the CRM.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => {
            const tagClass =
              task.urgency === "today"      ? "tag-hot"  :
              task.urgency === "this-week"  ? "tag-warm" : "tag-cool";
            const tagLabel =
              task.urgency === "today"      ? "TODAY"    :
              task.urgency === "this-week"  ? "THIS WK"  :
              task.urgency === "this-month" ? "THIS MO"  : "SOMEDAY";

            return (
              <div key={task.id} className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {task.key && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />}
                    <p className="text-xs text-[var(--ink-1)] leading-snug truncate">{task.title}</p>
                  </div>
                  {task.tags.length > 0 && (
                    <p className="text-[9px] font-mono text-[var(--ink-3)] tracking-widest uppercase mt-0.5">
                      {task.tags.slice(0, 2).join(" · ")}
                    </p>
                  )}
                </div>
                <span className={`text-[9px] font-mono rounded px-1.5 py-0.5 shrink-0 mt-0.5 ${tagClass}`}>
                  {tagLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
