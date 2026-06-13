"use client";

import type { Task } from "@/lib/types/task";
import { URGENCY_LABELS } from "@/lib/types/task";

interface Props {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function CategoryView({ tasks, onTaskClick }: Props) {
  // Group by entityId (use "General" for empty)
  const groups: Record<string, Task[]> = {};
  for (const task of tasks) {
    const key = task.entityId || "General";
    if (!groups[key]) groups[key] = [];
    groups[key].push(task);
  }

  const sorted = Object.entries(groups).sort(([a], [b]) => {
    if (a === "General") return 1;
    if (b === "General") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6 overflow-y-auto h-full">
      {sorted.map(([entity, entityTasks]) => (
        <div key={entity}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] font-mono tracking-widest text-[var(--accent)]">
              {entity.toUpperCase()}
            </span>
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[10px] font-mono text-[var(--ink-3)]">{entityTasks.length}</span>
          </div>
          <div className="space-y-2">
            {entityTasks.map(task => (
              <button
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="w-full text-left flex items-center gap-3 bg-[var(--surface)] border border-[var(--border)] rounded p-3 hover:border-[var(--accent)] transition-colors group"
              >
                {task.key && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />}
                <span className="flex-1 text-sm text-[var(--ink-0)] group-hover:text-white truncate transition-colors">
                  {task.title}
                </span>
                <span className="text-[10px] font-mono text-[var(--ink-3)] shrink-0">
                  {URGENCY_LABELS[task.urgency]}
                </span>
                {task.dueDate && (
                  <span className="text-[10px] font-mono text-[var(--warn)] shrink-0">
                    {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {tasks.length === 0 && (
        <div className="flex items-center justify-center h-40">
          <p className="text-sm text-[var(--ink-3)]">No open tasks</p>
        </div>
      )}
    </div>
  );
}
