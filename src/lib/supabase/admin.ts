import "server-only";
import { createClient } from "@supabase/supabase-js";

// Client Supabase con service role: bypassa RLS. Solo server-side (route handler).
// Usato per l'upsert nella cache `movies`.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
