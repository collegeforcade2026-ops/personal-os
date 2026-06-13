"use client";

import { useState } from "react";
import type { Task, Urgency } from "@/lib/types/task";

interface Props {
  task: Task | null;
  onClose: () => void;
  onSave: (updates: Partial<Task>) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function TaskDrawer({ task, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [urgency, setUrgency] = useState<Urgency>(task?.urgency ?? "someday");
  const [key, setKey] = useState(task?.key ?? false);
  const [tags, setTags] = useState(task?.tags.join(", ") ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!task) return null;

  async function handleSave() {
    setSaving(true);
    await onSave({
      title,
      description,
      urgency,
      key,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      dueDate,
    });
    setSaving(false);
    onClose();
  }

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return; }
    await onDelete();
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[400px] z-50 bg-[var(--surface)] border-l border-[var(--border)] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <span className="font-mono text-[11px] tracking-widest text-[var(--ink-2)]">TASK DETAIL</span>
          <button onClick={onClose} className="text-[var(--ink-2)] hover:text-[var(--ink-0)] text-lg leading-none">×</button>
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[10px] font-mono tracking-widest text-[var(--ink-2)] mb-1.5">TITLE</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--ink-0)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-mono tracking-widest text-[var(--ink-2)] mb-1.5">DESCRIPTION</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--ink-0)] focus:outline-none focus:border-[var(--accent)] resize-none"
            />
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-[10px] font-mono tracking-widest text-[var(--ink-2)] mb-1.5">URGENCY</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["today", "this-week", "this-month", "someday"] as Urgency[]).map(u => (
                <button
                  key={u}
                  onClick={() => setUrgency(u)}
                  className={`py-1.5 rounded text-[11px] font-mono tracking-wider border transition-colors ${
                    urgency === u
                      ? "bg-[var(--accent-dim)] border-[var(--accent)] text-[var(--ink-0)]"
                      : "border-[var(--border)] text-[var(--ink-2)] hover:text-[var(--ink-1)]"
                  }`}
                >
                  {u === "today" ? "TODAY" : u === "this-week" ? "THIS WEEK" : u === "this-month" ? "THIS MONTH" : "SOMEDAY"}
                </button>
              ))}
            </div>
          </div>

          {/* Key flag */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setKey(!key)}
              className={`w-9 h-5 rounded-full transition-colors relative ${key ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-[var(--ink-0)] transition-all ${key ? "left-4" : "left-0.5"}`} />
            </button>
            <span className="text-[11px] font-mono tracking-wider text-[var(--ink-1)]">KEY TASK</span>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[10px] font-mono tracking-widest text-[var(--ink-2)] mb-1.5">TAGS (comma-separated)</label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--ink-0)] focus:outline-none focus:border-[var(--accent)]"
              placeholder="design, urgent, personal"
            />
          </div>

          {/* Due date */}
          <div>
            <label className="block text-[10px] font-mono tracking-widest text-[var(--ink-2)] mb-1.5">DUE DATE</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--ink-0)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Meta */}
          <div className="pt-2 text-[10px] font-mono text-[var(--ink-3)] space-y-1">
            <div>CREATED {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : "—"}</div>
            <div>UPDATED {task.updatedAt ? new Date(task.updatedAt).toLocaleDateString() : "—"}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 py-4 border-t border-[var(--border)]">
          <button
            onClick={handleDelete}
            className={`px-3 py-2 rounded text-[11px] font-mono tracking-wider border transition-colors ${
              confirming
                ? "border-[var(--danger)] text-[var(--danger)] bg-[var(--hot-bg)]"
                : "border-[var(--border)] text-[var(--ink-2)] hover:text-[var(--danger)] hover:border-[var(--danger)]"
            }`}
          >
            {confirming ? "CONFIRM DELETE" : "MARK DONE"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-3 py-2 rounded text-[11px] font-mono tracking-wider bg-[var(--accent-dim)] border border-[var(--accent)] text-[var(--ink-0)] hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
          >
            {saving ? "SAVING..." : "SAVE"}
          </button>
        </div>
      </div>
    </>
  );
}
