import { NextRequest, NextResponse } from "next/server";
import { getTasks, createTask } from "@/lib/data/tasks";
import type { Task } from "@/lib/types/task";
import { randomUUID } from "crypto";

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
    const now = new Date().toISOString();
    const task: Task = {
      id: randomUUID(),
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
      createdAt: now,
      updatedAt: now,
    };
    await createTask(task);
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/tasks]", err);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
