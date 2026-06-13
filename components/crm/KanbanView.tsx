"use client";

import { useState, useRef } from "react";
import type { Task, Urgency } from "@/lib/types/task";
import { URGENCY_LABELS, URGENCY_ORDER } from "@/lib/types/task";

interface Props {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskCreate: (urgency: Urgency) => void;
  onReorder: (tasks: Task[]) => void;
}

interface TaskCardProps {
  task: Task;
  onTaskClick: (task: Task) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDragOver: (e: React.DragEvent, task: Task) => void;
  onDrop: (e: React.DragEvent, task: Task) => void;
}

function TaskCard({ task, onTaskClick, onDragStart, onDragOver, onDrop }: TaskCardProps) {
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task)}
      onDragOver={e => onDragOver(e, task)}
      onDrop={e => onDrop(e, task)}
      onClick={() => onTaskClick(task)}
      className="bg-[var(--background)] border border-[var(--border)] rounded p-3 cursor-pointer hover:border-[var(--accent)] transition-colors group"
    >
      <div className="flex items-start gap-2">
        {task.key && (
          <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" title="Key task" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[var(--ink-0)] leading-snug group-hover:text-white transition-colors truncate">
            {task.title}
          </p>
          {task.description && (
            <p className="text-[11px] text-[var(--ink-3)] mt-1 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {task.dueDate && (
              <span className="text-[10px] font-mono text-[var(--warn)]">
                {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
            {task.tags.map(tag => (
              <span key={tag} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--border)] text-[var(--ink-2)]">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const COL_STYLES: Record<Urgency, { accent: string; label: string }> = {
  "today":      { accent: "var(--danger)", label: "text-[var(--danger)]" },
  "this-week":  { accent: "var(--warn)",   label: "text-[var(--warn)]" },
  "this-month": { accent: "var(--accent)", label: "text-[var(--accent)]" },
  "someday":    { accent: "var(--ink-2)",  label: "text-[var(--ink-2)]" },
};

export function KanbanView({ tasks, onTaskClick, onTaskCreate, onReorder }: Props) {
  const [newTitles, setNewTitles] = useState<Partial<Record<Urgency, string>>>({});
  const dragTask = useRef<Task | null>(null);

  function getColumn(urgency: Urgency) {
    return tasks
      .filter(t => t.urgency === urgency)
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }

  function handleDragStart(e: React.DragEvent, task: Task) {
    dragTask.current = task;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, _target: Task) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, target: Task) {
    e.preventDefault();
    const src = dragTask.current;
    if (!src || src.id === target.id || src.urgency !== target.urgency) return;

    const col = getColumn(src.urgency);
    const srcIdx = col.findIndex(t => t.id === src.id);
    const tgtIdx = col.findIndex(t => t.id === target.id);
    const reordered = [...col];
    reordered.splice(srcIdx, 1);
    reordered.splice(tgtIdx, 0, src);

    // Assign descending priority scores
    const updates = reordered.map((t, i) => ({ ...t, priorityScore: reordered.length - i }));
    const newTasks = tasks.map(t => {
      const upd = updates.find(u => u.id === t.id);
      return upd ?? t;
    });
    onReorder(newTasks);
    dragTask.current = null;
  }

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, urgency: Urgency) {
    if (e.key === "Enter") {
      const val = newTitles[urgency]?.trim();
      if (!val) return;
      setNewTitles(prev => ({ ...prev, [urgency]: "" }));
      onTaskCreate(urgency);
    }
  }

  return (
    <div className="grid grid-cols-4 gap-3 h-full overflow-hidden">
      {URGENCY_ORDER.map(urgency => {
        const col = getColumn(urgency);
        const style = COL_STYLES[urgency];

        return (
          <div key={urgency} className="flex flex-col min-h-0">
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.accent }} />
                <span className={`text-[10px] font-mono tracking-widest ${style.label}`}>
                  {URGENCY_LABELS[urgency]}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[var(--ink-3)]">{col.length}</span>
            </div>

            {/* Tasks */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
              {col.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onTaskClick={onTaskClick}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />
              ))}
            </div>

            {/* New task input */}
            <div className="mt-3 shrink-0">
              <input
                value={newTitles[urgency] ?? ""}
                onChange={e => setNewTitles(prev => ({ ...prev, [urgency]: e.target.value }))}
                onKeyDown={e => handleKeyDown(e, urgency)}
                placeholder="+ Add task…"
                className="w-full bg-transparent border border-dashed border-[var(--border)] rounded px-2.5 py-2 text-[11px] text-[var(--ink-2)] placeholder-[var(--ink-3)] focus:outline-none focus:border-[var(--accent)] focus:text-[var(--ink-0)] transition-colors"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
