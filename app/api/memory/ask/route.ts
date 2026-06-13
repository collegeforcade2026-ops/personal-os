import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { query, context } = await req.json() as { query: string; context: string };

    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are the user's personal AI assistant with access to their memory — captures, tasks, journal entries, and notes.
Answer their question using ONLY the context provided below. Be direct and specific.
If the context doesn't contain enough information, say so briefly.
Cite sources by referencing [1], [2] etc. from the context numbers.
Keep the answer concise — 2-4 sentences unless a longer answer is clearly needed.`,
      messages: [{
        role: "user",
        content: `Context from my memory:\n\n${context}\n\nQuestion: ${query}`,
      }],
    });

    const answer = message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ answer });
  } catch (err) {
    console.error("[memory/ask]", err);
    return NextResponse.json({ answer: "" });
  }
}
