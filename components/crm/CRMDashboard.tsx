"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Task, Urgency } from "@/lib/types/task";
import { KanbanView } from "./KanbanView";
import { SmartView } from "./SmartView";
import { CategoryView } from "./CategoryView";
import { TaskDrawer } from "./TaskDrawer";

type View = "kanban" | "smart" | "category";

interface Props {
  initialTasks: Task[];
}

const VIEWS: { id: View; label: string }[] = [
  { id: "kanban",   label: "KANBAN" },
  { id: "smart",    label: "SMART" },
  { id: "category", label: "CATEGORY" },
];

export function CRMDashboard({ initialTasks }: Props) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [view, setView] = useState<View>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("crm-view") as View) ?? "kanban";
    }
    return "kanban";
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [pendingUrgency, setPendingUrgency] = useState<Urgency | null>(null);
  const [addingTitle, setAddingTitle] = useState("");
  const addRef = useRef<HTMLInputElement>(null);

  // Persist view to localStorage
  useEffect(() => {
    localStorage.setItem("crm-view", view);
  }, [view]);

  // Total open count
  const openCount = tasks.length;
  const keyCount = tasks.filter(t => t.key).length;

  async function handleTaskCreate(urgency: Urgency) {
    setPendingUrgency(urgency);
    setAddingTitle("");
    setTimeout(() => addRef.current?.focus(), 50);
  }

  async function submitNewTask(title: string, urgency: Urgency) {
    if (!title.trim()) { setPendingUrgency(null); return; }
    const optimisticTask: Task = {
      id: `temp-${Date.now()}`,
      title,
      description: "",
      urgency,
      key: false,
      priorityScore: tasks.filter(t => t.urgency === urgency).length,
      tags: [],
      dueDate: "",
      entityId: "",
      owner: "",
      completedAt: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTasks(prev => [optimisticTask, ...prev]);
    setPendingUrgency(null);
    setAddingTitle("");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, urgency }),
      });
      const data = await res.json() as { task: Task };
      setTasks(prev => prev.map(t => t.id === optimisticTask.id ? data.task : t));
    } catch {
      setTasks(prev => prev.filter(t => t.id !== optimisticTask.id));
    }
  }

  async function handleTaskSave(updates: Partial<Task>) {
    if (!selectedTask) return;
    const updated = { ...selectedTask, ...updates };
    setTasks(prev => prev.map(t => t.id === selectedTask.id ? updated : t));
    try {
      await fetch(`/api/tasks/${selectedTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error("Save failed", err);
    }
  }

  async function handleTaskDelete() {
    if (!selectedTask) return;
    setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
    try {
      await fetch(`/api/tasks/${selectedTask.id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Delete failed", err);
    }
    setSelectedTask(null);
  }

  async function handleTaskComplete(task: Task) {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    try {
      await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    } catch (err) {
      console.error("Complete failed", err);
      // Restore on failure
      setTasks(prev => [...prev, task]);
    }
  }

  async function handleReorder(reorderedTasks: Task[]) {
    setTasks(reorderedTasks);
    // Persist any changed fields (urgency and/or priorityScore)
    const changed = reorderedTasks.filter(t => {
      const orig = tasks.find(o => o.id === t.id);
      return orig && (orig.priorityScore !== t.priorityScore || orig.urgency !== t.urgency);
    });
    await Promise.all(changed.map(t => {
      const orig = tasks.find(o => o.id === t.id)!;
      const patch: Record<string, unknown> = {};
      if (orig.priorityScore !== t.priorityScore) patch.priorityScore = t.priorityScore;
      if (orig.urgency !== t.urgency) patch.urgency = t.urgency;
      return fetch(`/api/tasks/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    }));
  }

  return (
    <div className="h-full flex flex-col">
      {/* CRM header bar */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-mono text-[11px] tracking-widest text-[var(--ink-0)]">CRM</h1>
            <p className="font-mono text-[10px] text-[var(--ink-3)]">
              {openCount} OPEN · {keyCount} KEY
            </p>
          </div>
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded p-1">
          {VIEWS.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-3 py-1 rounded text-[10px] font-mono tracking-wider transition-colors ${
                view === v.id
                  ? "bg-[var(--accent-dim)] text-[var(--ink-0)] border border-[var(--accent)]"
                  : "text-[var(--ink-2)] hover:text-[var(--ink-1)]"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Quick add */}
        <button
          onClick={() => handleTaskCreate("today")}
          className="flex items-center gap-2 px-3 py-1.5 rounded border border-[var(--border)] text-[11px] font-mono tracking-wider text-[var(--ink-2)] hover:text-[var(--ink-0)] hover:border-[var(--accent)] transition-colors"
        >
          + NEW TASK
        </button>
      </div>

      {/* Quick-add modal (appears when + NEW TASK clicked) */}
      {pendingUrgency !== null && (
        <div className="shrink-0 mb-4 bg-[var(--surface)] border border-[var(--accent)] rounded-lg p-4">
          <p className="text-[10px] font-mono tracking-widest text-[var(--accent)] mb-2">
            NEW TASK — {pendingUrgency.toUpperCase().replace("-", " ")}
          </p>
          <div className="flex items-center gap-2">
            <input
              ref={addRef}
              value={addingTitle}
              onChange={e => setAddingTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") submitNewTask(addingTitle, pendingUrgency!);
                if (e.key === "Escape") setPendingUrgency(null);
              }}
              placeholder="Task title…"
              className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--ink-0)] focus:outline-none focus:border-[var(--accent)]"
            />
            <div className="flex gap-1">
              {(["today", "this-week", "this-month", "someday"] as Urgency[]).map(u => (
                <button
                  key={u}
                  onClick={() => setPendingUrgency(u)}
                  className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${
                    pendingUrgency === u
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--ink-3)]"
                  }`}
                >
                  {u === "today" ? "TODAY" : u === "this-week" ? "WEEK" : u === "this-month" ? "MONTH" : "SOME"}
                </button>
              ))}
            </div>
            <button
              onClick={() => submitNewTask(addingTitle, pendingUrgency!)}
              className="px-3 py-2 rounded bg-[var(--accent-dim)] border border-[var(--accent)] text-[11px] font-mono text-[var(--ink-0)] hover:bg-[var(--accent)] transition-colors"
            >
              ADD
            </button>
            <button
              onClick={() => setPendingUrgency(null)}
              className="px-2 py-2 text-[var(--ink-3)] hover:text-[var(--ink-1)]"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main view */}
      <div className="flex-1 min-h-0">
        {view === "kanban" && (
          <KanbanView
            tasks={tasks}
            onTaskClick={setSelectedTask}
            onTaskCreate={handleTaskCreate}
            onTaskComplete={handleTaskComplete}
            onReorder={handleReorder}
          />
        )}
        {view === "smart" && (
          <SmartView onTaskClick={setSelectedTask} />
        )}
        {view === "category" && (
          <CategoryView tasks={tasks} onTaskClick={setSelectedTask} />
        )}
      </div>

      {/* Task drawer */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={handleTaskSave}
          onDelete={handleTaskDelete}
        />
      )}
    </div>
  );
}
