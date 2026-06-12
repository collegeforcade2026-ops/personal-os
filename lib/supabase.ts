import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-only client — bypasses RLS
export const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
