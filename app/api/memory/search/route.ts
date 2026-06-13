import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";

const USER_ID = process.env.USER_ID ?? "cade";

export interface MemoryChunk {
  id: string;
  source_type: string;
  source_id: string;
  text: string;
  created_at: string;
  similarity: number;
}

export async function POST(req: NextRequest) {
  try {
    const { query, limit = 20 } = await req.json() as { query: string; limit?: number };
    if (!query?.trim()) return NextResponse.json({ chunks: [] });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Embed the query
    const embRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query.slice(0, 8000),
    });
    const queryEmbedding = embRes.data[0].embedding;

    // Vector similarity search via Supabase RPC
    const { data, error } = await supabase.rpc("match_memory_chunks", {
      query_embedding: queryEmbedding,
      match_count: limit,
      filter_user_id: USER_ID,
    });

    if (error) {
      // Fallback: plain text search if RPC not set up yet
      console.warn("[memory/search] RPC failed, falling back to text search:", error.message);
      const { data: fallback } = await supabase
        .from("memory_chunks")
        .select("id, source_type, source_id, text, created_at")
        .eq("user_id", USER_ID)
        .ilike("text", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(limit);

      return NextResponse.json({
        chunks: (fallback ?? []).map(c => ({ ...c, similarity: 1 })),
        fallback: true,
      });
    }

    return NextResponse.json({ chunks: data as MemoryChunk[] });
  } catch (err) {
    console.error("[memory/search]", err);
    return NextResponse.json({ chunks: [] });
  }
}
