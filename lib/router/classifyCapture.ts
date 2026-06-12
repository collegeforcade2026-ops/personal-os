import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export interface Classification {
  kind: "task" | "note" | "journal" | "decision" | "capture";
  urgency: "today" | "this_week" | "this_month" | "someday";
  entity_id: string | null;
  tags: string[];
  summary: string;
}

const SYSTEM_PROMPT = `You are a personal assistant that classifies incoming captures.
Given a piece of text, return a JSON object with these fields:
- kind: one of "task", "note", "journal", "decision", "capture"
- urgency: one of "today", "this_week", "this_month", "someday"
- entity_id: null (we will resolve entities later)
- tags: array of relevant tags (max 3, lowercase)
- summary: one sentence summary of the capture

Rules:
- If it sounds like something to DO, it's a "task"
- If it's a reflection or personal thought, it's "journal"
- If it's a decision made, it's "decision"
- If it's information or a link, it's "note"
- Otherwise, "capture"
- Urgency should match the nature of the task (explicit deadlines → today/this_week)

Respond with valid JSON only, no markdown.`;

export async function classifyCapture(text: string): Promise<Classification> {
  // Try Anthropic first
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    });
    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    return JSON.parse(raw) as Classification;
  } catch (err) {
    console.warn("[classifier] Anthropic failed, trying OpenAI:", err);
  }

  // Fallback to OpenAI
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.chat.completions.create({
      model: process.env.OPENAI_CLASSIFIER_MODEL ?? "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      max_tokens: 256,
    });
    const raw = res.choices[0].message.content?.trim() ?? "";
    return JSON.parse(raw) as Classification;
  } catch (err) {
    console.warn("[classifier] OpenAI failed, using regex fallback:", err);
  }

  // Regex last resort
  const lower = text.toLowerCase();
  const isTask = /\b(do|fix|send|call|write|finish|complete|ship|review|schedule)\b/.test(lower);
  const isUrgent = /\b(today|urgent|asap|now|immediately)\b/.test(lower);

  return {
    kind: isTask ? "task" : "capture",
    urgency: isUrgent ? "today" : "this_week",
    entity_id: null,
    tags: [],
    summary: text.slice(0, 100),
  };
}
