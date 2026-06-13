-- Vector similarity search function for Brain tab
-- Run this in the Supabase SQL editor at supabase.com → your project → SQL Editor

create or replace function match_memory_chunks(
  query_embedding vector(1536),
  match_count      int,
  filter_user_id   text
)
returns table (
  id           uuid,
  source_type  text,
  source_id    uuid,
  text         text,
  created_at   timestamptz,
  similarity   float
)
language sql stable
as $$
  select
    mc.id,
    mc.source_type,
    mc.source_id,
    mc.text,
    mc.created_at,
    1 - (mc.embedding <=> query_embedding) as similarity
  from memory_chunks mc
  where mc.user_id = filter_user_id
    and mc.embedding is not null
  order by mc.embedding <=> query_embedding
  limit match_count;
$$;
