import { supabase } from "@/lib/supabase";
import type { Task, Urgency } from "@/lib/types/task";
import { embedAndStore } from "@/lib/data/embedAndStore";

const USER_ID = process.env.USER_ID ?? "cade";

// Map DB row → Task
function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    urgency: (row.urgency as Urgency) ?? "someday",
    key: Boolean(row.key),
    priorityScore: Number(row.priority_score ?? 0),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    dueDate: row.due_date ? String(row.due_date) : "",
    entityId: row.entity_id ? String(row.entity_id) : "",
    owner: String(row.owner ?? ""),
    completedAt: row.completed_at ? String(row.completed_at) : "",
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export async function getTasks(status: "open" | "done" = "open"): Promise<Task[]> {
  const query = supabase
    .from("tasks")
    .select("*")
    .eq("user_id", USER_ID)
    .order("priority_score", { ascending: false })
    .order("created_at", { ascending: false });

  const { data, error } = status === "open"
    ? await query.is("completed_at", null)
    : await query.not("completed_at", "is", null);

  if (error) { console.error("[getTasks]", error); return []; }
  return (data ?? []).map(rowToTask);
}

export async function createTask(task: Task): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: USER_ID,
      title: task.title,
      description: task.description || null,
      urgency: task.urgency,
      key: task.key,
      priority_score: task.priorityScore,
      tags: task.tags,
      due_date: task.dueDate || null,
      owner: task.owner || null,
    })
    .select()
    .single();

  if (error) throw new Error(`createTask failed: ${error.message}`);

  const saved = rowToTask(data as Record<string, unknown>);

  // Embed async — don't block response
  const text = [task.title, task.description].filter(Boolean).join(" — ");
  embedAndStore(text, "task", saved.id).catch(console.error);

  return saved;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.title       !== undefined) patch.title          = updates.title;
  if (updates.description !== undefined) patch.description    = updates.description;
  if (updates.urgency     !== undefined) patch.urgency        = updates.urgency;
  if (updates.key         !== undefined) patch.key            = updates.key;
  if (updates.priorityScore !== undefined) patch.priority_score = updates.priorityScore;
  if (updates.tags        !== undefined) patch.tags           = updates.tags;
  if (updates.dueDate     !== undefined) patch.due_date       = updates.dueDate || null;
  if (updates.owner       !== undefined) patch.owner          = updates.owner || null;
  if (updates.completedAt !== undefined) patch.completed_at   = updates.completedAt || null;
  patch.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .eq("user_id", USER_ID);

  if (error) throw new Error(`updateTask failed: ${error.message}`);

  // Re-embed if text changed
  if (updates.title || updates.description) {
    const { data } = await supabase.from("tasks").select("title, description").eq("id", id).single();
    if (data) {
      const text = [data.title, data.description].filter(Boolean).join(" — ");
      embedAndStore(text, "task", id).catch(console.error);
    }
  }
}
