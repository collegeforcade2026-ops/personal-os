"use client";

import { useState, useRef } from "react";
import type { Task, Urgency } from "@/lib/types/task";
import { URGENCY_LABELS, URGENCY_ORDER } from "@/lib/types/task";

interface Props {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskCreate: (urgency: Urgency) => void;
  onTaskComplete: (task: Task) => void;
  onReorder: (tasks: Task[]) => void;
}

interface TaskCardProps {
  task: Task;
  onTaskClick: (task: Task) => void;
  onTaskComplete: (task: Task) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, task: Task) => void;
}

function TaskCard({ task, onTaskClick, onTaskComplete, onDragStart, onDragOver, onDrop }: TaskCardProps) {
  const [completing, setCompleting] = useState(false);

  async function handleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    setCompleting(true);
    await new Promise(r => setTimeout(r, 300)); // brief visual feedback
    onTaskComplete(task);
  }

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task)}
      onDragOver={e => onDragOver(e)}
      onDrop={e => onDrop(e, task)}
      onClick={() => onTaskClick(task)}
      className={`bg-[var(--background)] border border-[var(--border)] rounded p-3 cursor-pointer hover:border-[var(--accent)] transition-all group ${completing ? "opacity-40 scale-95" : ""}`}
    >
      <div className="flex items-start gap-2">
        {/* Complete checkbox */}
        <button
          onClick={handleComplete}
          title="Mark done"
          className="mt-0.5 w-4 h-4 rounded border border-[var(--ink-3)] hover:border-[var(--accent)] hover:bg-[var(--accent-dim)] flex items-center justify-center shrink-0 transition-colors"
        >
          {completing && <span className="text-[var(--accent)] text-[9px]">✓</span>}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {task.key && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" title="Key task" />
            )}
            <p className="text-sm text-[var(--ink-0)] leading-snug group-hover:text-white transition-colors truncate">
              {task.title}
            </p>
          </div>
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

export function KanbanView({ tasks, onTaskClick, onTaskCreate, onTaskComplete, onReorder }: Props) {
  const [newTitles, setNewTitles] = useState<Partial<Record<Urgency, string>>>({});
  const [dragOverCol, setDragOverCol] = useState<Urgency | null>(null);
  const dragTask = useRef<Task | null>(null);

  function getColumn(urgency: Urgency) {
    return tasks
      .filter(t => t.urgency === urgency)
      .sort((a, b) => {
        if (a.key !== b.key) return a.key ? -1 : 1;
        return b.priorityScore - a.priorityScore;
      });
  }

  function handleDragStart(e: React.DragEvent, task: Task) {
    dragTask.current = task;
    e.dataTransfer.effectAllowed = "move";
  }

  // Card-level drop: insert before/at the target card (works cross-column too)
  function handleCardDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation(); // don't trigger column highlight when over a card
    e.dataTransfer.dropEffect = "move";
  }

  function handleCardDrop(e: React.DragEvent, target: Task) {
    e.preventDefault();
    e.stopPropagation();
    const src = dragTask.current;
    if (!src || src.id === target.id) return;

    const destUrgency = target.urgency;
    const destCol = getColumn(destUrgency).filter(t => t.id !== src.id);
    const tgtIdx = destCol.findIndex(t => t.id === target.id);

    // Insert src before target in destination column
    destCol.splice(tgtIdx, 0, { ...src, urgency: destUrgency });
    const updates = destCol.map((t, i) => ({ ...t, priorityScore: destCol.length - i }));

    const newTasks = tasks.map(t => {
      const upd = updates.find(u => u.id === t.id);
      return upd ?? t;
    });
    onReorder(newTasks);
    dragTask.current = null;
    setDragOverCol(null);
  }

  // Column-level drop: append to bottom of the column
  function handleColumnDragOver(e: React.DragEvent, urgency: Urgency) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(urgency);
  }

  function handleColumnDrop(e: React.DragEvent, urgency: Urgency) {
    e.preventDefault();
    const src = dragTask.current;
    if (!src) return;

    // If same column and dropped on empty space, no-op
    if (src.urgency === urgency) {
      dragTask.current = null;
      setDragOverCol(null);
      return;
    }

    // Move to bottom of destination column
    const destCol = getColumn(urgency);
    const updatedSrc = { ...src, urgency, priorityScore: 0 };
    // Shift existing scores up by 1 so new task lands at bottom
    const newTasks = tasks.map(t => {
      if (t.id === src.id) return updatedSrc;
      return t;
    });
    onReorder(newTasks);
    dragTask.current = null;
    setDragOverCol(null);
  }

  function handleColumnDragLeave(e: React.DragEvent) {
    // Only clear if leaving the column entirely (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverCol(null);
    }
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
        const isOver = dragOverCol === urgency;

        return (
          <div
            key={urgency}
            className="flex flex-col min-h-0"
            onDragOver={e => handleColumnDragOver(e, urgency)}
            onDragLeave={handleColumnDragLeave}
            onDrop={e => handleColumnDrop(e, urgency)}
          >
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

            {/* Tasks — drop highlight when dragging into column */}
            <div
              className={`flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 rounded transition-colors ${
                isOver ? "bg-[var(--accent-dim)]/20 ring-1 ring-inset ring-[var(--accent)]/30" : ""
              }`}
            >
              {col.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onTaskClick={onTaskClick}
                  onTaskComplete={onTaskComplete}
                  onDragStart={handleDragStart}
                  onDragOver={handleCardDragOver}
                  onDrop={handleCardDrop}
                />
              ))}
              {/* Empty column drop target */}
              {col.length === 0 && (
                <div className="h-20 rounded border border-dashed border-[var(--border)] flex items-center justify-center">
                  <span className="text-[10px] font-mono text-[var(--ink-3)]">drop here</span>
                </div>
              )}
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
