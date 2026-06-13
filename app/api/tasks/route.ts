import { NextRequest, NextResponse } from "next/server";
import { getTasks, createTask } from "@/lib/data/tasks";
import type { Task } from "@/lib/types/task";

export async function GET(req: NextRequest) {
  const status = (req.nextUrl.searchParams.get("status") ?? "open") as "open" | "done";
  try {
    const tasks = await getTasks(status);
    return NextResponse.json({ tasks });
  } catch (err) {
    console.error("[GET /api/tasks]", err);
    return NextResponse.json({ tasks: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Partial<Task>;
    // Pass a shell task — Supabase generates the real UUID
    const task = await createTask({
      id: "",
      title: body.title ?? "Untitled",
      description: body.description ?? "",
      urgency: body.urgency ?? "someday",
      key: body.key ?? false,
      priorityScore: body.priorityScore ?? 0,
      tags: body.tags ?? [],
      dueDate: body.dueDate ?? "",
      entityId: body.entityId ?? "",
      owner: body.owner ?? "",
      completedAt: "",
      createdAt: "",
      updatedAt: "",
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/tasks]", err);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
