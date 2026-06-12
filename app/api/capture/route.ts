import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { classifyCapture } from "@/lib/router/classifyCapture";

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
    await supabase.from("tasks").insert({
      title: classification.summary,
      urgency: classification.urgency,
      tags: classification.tags,
      user_id: process.env.USER_ID ?? "cade",
    });
  }

  // Embed to memory (fire and forget)
  embedToMemory(text, capture.id).catch(console.error);

  await supabase.from("audit_log").insert({
    action: "capture_created",
    resource_type: "raw_captures",
    resource_id: capture.id,
    user_id: process.env.USER_ID ?? "cade",
    metadata: { source: "web", kind: classification.kind },
  });

  return NextResponse.json({ ok: true, capture: { id: capture.id, ...classification } });
}

async function embedToMemory(text: string, captureId: string) {
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  await supabase.from("memory_chunks").insert({
    source_id: captureId,
    source_type: "capture",
    text,
    embedding: res.data[0].embedding,
    user_id: process.env.USER_ID ?? "cade",
  });
}
