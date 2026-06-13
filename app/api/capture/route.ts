import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { classifyCapture } from "@/lib/router/classifyCapture";
import { createTask } from "@/lib/data/tasks";
import type { Urgency } from "@/lib/types/task";
import { embedAndStore } from "@/lib/data/embedAndStore";

const URGENCY_MAP: Record<string, Urgency> = {
  today: "today",
  this_week: "this-week",
  this_month: "this-month",
  someday: "someday",
};

export async function POST(req: NextRequest) {
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const classification = await classifyCapture(text);

  const { data: capture, error } = await supabase
    .from("raw_captures")
    .insert({
      source: "web",
      raw_text: text,
      classification: {
        kind: classification.kind,
        urgency: classification.urgency,
        tags: classification.tags,
        summary: classification.summary,
        entity_id: classification.entity_id,
      },
      user_id: process.env.USER_ID ?? "cade",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[capture] DB insert failed:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  if (classification.kind === "task") {
    const now = new Date().toISOString();
    await createTask({
      id: "",
      title: classification.summary,
      description: text !== classification.summary ? text : "",
      urgency: URGENCY_MAP[classification.urgency] ?? "someday",
      key: false,
      priorityScore: 0,
      tags: classification.tags ?? [],
      dueDate: "",
      entityId: "",
      owner: "",
      completedAt: "",
      createdAt: now,
      updatedAt: now,
    });
  }

  // Embed to memory (fire and forget)
  embedAndStore(text, "capture", capture.id).catch(console.error);

  await supabase.from("audit_log").insert({
    action: "capture_created",
    resource_type: "raw_captures",
    resource_id: capture.id,
    user_id: process.env.USER_ID ?? "cade",
    metadata: { source: "web", kind: classification.kind },
  });

  return NextResponse.json({ ok: true, capture: { id: capture.id, ...classification } });
}
