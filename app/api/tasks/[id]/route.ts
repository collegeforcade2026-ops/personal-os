import { NextRequest, NextResponse } from "next/server";
import { updateTask } from "@/lib/data/tasks";
import type { Task } from "@/lib/types/task";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const updates = await req.json() as Partial<Task>;
    await updateTask(id, updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/tasks/[id]]", err);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await updateTask(id, { completedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/tasks/[id]]", err);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
