import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";
import { classifyCapture } from "@/lib/router/classifyCapture";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET!;
const ALLOWED_USER_ID = Number(process.env.TELEGRAM_USER_ID!);

async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: object) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: replyMarkup,
    }),
  });
}

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const callbackQuery = body.callback_query as Record<string, unknown> | undefined;
  const message = (body.message ?? callbackQuery?.message) as Record<string, unknown> | undefined;
  if (!message) return NextResponse.json({ ok: true });

  const fromId = (message.from as Record<string, unknown>)?.id as number;
  if (fromId !== ALLOWED_USER_ID) {
    return NextResponse.json({ ok: true }); // silently ignore
  }

  const chatId = (message.chat as Record<string, unknown>)?.id as number;
  let rawText = "";

  // Handle voice messages
  if (message.voice) {
    try {
      const fileId = (message.voice as Record<string, unknown>).file_id as string;
      const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
      const fileData = await fileRes.json() as { result: { file_path: string } };
      const filePath = fileData.result.file_path;
      const audioUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

      // Download the audio
      const audioRes = await fetch(audioUrl);
      const audioBuffer = await audioRes.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: "audio/ogg" });

      // Transcribe with Whisper
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const file = new File([audioBlob], "voice.ogg", { type: "audio/ogg" });
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: "whisper-1",
      });
      rawText = transcription.text;
    } catch (err) {
      console.error("[telegram] Whisper transcription failed:", err);
      await sendTelegramMessage(chatId, "⚠️ Could not transcribe voice. Please try again.");
      return NextResponse.json({ ok: true });
    }
  } else if (message.text) {
    rawText = message.text as string;
  } else {
    return NextResponse.json({ ok: true }); // unsupported message type
  }

  if (!rawText.trim()) return NextResponse.json({ ok: true });

  // Classify the capture
  const classification = await classifyCapture(rawText);

  // Store in raw_captures
  const { data: capture, error: captureError } = await supabase
    .from("raw_captures")
    .insert({
      source: message.voice ? "telegram_voice" : "telegram_text",
      raw_text: rawText,
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

  if (captureError) {
    console.error("[telegram] Failed to store capture:", captureError);
    await sendTelegramMessage(chatId, "⚠️ Failed to save. Check logs.");
    return NextResponse.json({ ok: true });
  }

  // Route tasks to tasks table
  if (classification.kind === "task") {
    await supabase.from("tasks").insert({
      title: classification.summary,
      urgency: classification.urgency,
      tags: classification.tags,
      user_id: process.env.USER_ID ?? "cade",
    });
  }

  // Embed to memory_chunks (fire and forget)
  embedToMemory(rawText, capture.id).catch(console.error);

  // Audit log
  await supabase.from("audit_log").insert({
    action: "capture_created",
    resource_type: "raw_captures",
    resource_id: capture.id,
    user_id: process.env.USER_ID ?? "cade",
    metadata: { source: message.voice ? "telegram_voice" : "telegram_text", kind: classification.kind },
  });

  // Reply with confirmation + urgency keyboard
  const kindEmoji: Record<string, string> = {
    task: "✅", note: "📝", journal: "📓", decision: "⚡", capture: "📌",
  };
  const urgencyLabel: Record<string, string> = {
    today: "🔥 Today", this_week: "📅 This Week", this_month: "🗓 This Month", someday: "💭 Someday",
  };

  const replyText =
    `${kindEmoji[classification.kind] ?? "📌"} *${classification.kind.toUpperCase()}*\n` +
    `${classification.summary}\n` +
    `\n_${urgencyLabel[classification.urgency]}_`;

  await sendTelegramMessage(chatId, replyText, {
    inline_keyboard: [
      [
        { text: "🔥 Today", callback_data: `urgency:today:${capture.id}` },
        { text: "📅 Week", callback_data: `urgency:this_week:${capture.id}` },
      ],
      [
        { text: "💭 Someday", callback_data: `urgency:someday:${capture.id}` },
        { text: "🗑 Discard", callback_data: `discard:${capture.id}` },
      ],
    ],
  });

  return NextResponse.json({ ok: true });
}

async function embedToMemory(text: string, captureId: string) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const embeddingRes = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  const embedding = embeddingRes.data[0].embedding;

  await supabase.from("memory_chunks").insert({
    source_id: captureId,
    source_type: "capture",
    text,
    embedding,
    user_id: process.env.USER_ID ?? "cade",
  });
}
