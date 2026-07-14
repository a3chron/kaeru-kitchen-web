import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Server-only Supabase client using the service-role key. It bypasses RLS, so it
 * must NEVER be imported into a client component — the `server-only` import above
 * turns any such import into a build error.
 *
 * All privileged writes (submit, rate, flag) and reads that must see unapproved
 * rows (moderation) go through this client.
 */
export const supabaseServer = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
