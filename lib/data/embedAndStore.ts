import OpenAI from "openai";
import { supabase } from "@/lib/supabase";

const USER_ID = process.env.USER_ID ?? "cade";

export async function embedAndStore(
  text: string,
  sourceType: string,
  sourceId: string
): Promise<void> {
  if (!process.env.OPENAI_API_KEY || !text.trim()) return;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000), // API limit
  });

  const embedding = res.data[0].embedding;

  await supabase.from("memory_chunks").insert({
    user_id: USER_ID,
    source_type: sourceType,
    source_id: sourceId,
    text,
    embedding,
  });
}
