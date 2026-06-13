import { NextRequest, NextResponse } from "next/server";
import { getTasks } from "@/lib/data/tasks";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json() as { query: string };
    const tasks = await getTasks("open");

    const taskList = tasks.map(t =>
      `ID: ${t.id} | Title: ${t.title} | Urgency: ${t.urgency} | Tags: ${t.tags.join(", ")} | Desc: ${t.description}`
    ).join("\n");

    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 512,
      system: `You are a task search assistant. Given a natural-language query, return a JSON array of task IDs from the list that best match. Return ONLY a JSON array of ID strings, no explanation. If nothing matches, return [].`,
      messages: [{
        role: "user",
        content: `Tasks:\n${taskList}\n\nQuery: "${query}"\n\nReturn matching task IDs as JSON array:`,
      }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text.trim() : "[]";
    const match = text.match(/\[[\s\S]*\]/);
    const ids: string[] = match ? JSON.parse(match[0]) : [];
    const matched = tasks.filter(t => ids.includes(t.id));
    return NextResponse.json({ tasks: matched });
  } catch (err) {
    console.error("[POST /api/tasks/smart]", err);
    return NextResponse.json({ tasks: [] });
  }
}
