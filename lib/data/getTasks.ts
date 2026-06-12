import { supabase } from "@/lib/supabase";

export interface Task {
  id: string;
  title: string;
  urgency: "today" | "this_week" | "this_month" | "someday";
  tags: string[];
  key: boolean;
  completed_at: string | null;
  created_at: string;
}

export async function getOpenTasks(limit = 10): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, urgency, tags, key, completed_at, created_at")
    .is("completed_at", null)
    .order("key", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getTasks]", error);
    return [];
  }

  return data ?? [];
}
