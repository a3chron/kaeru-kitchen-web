import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    // Fail closed at first use rather than at import: constructing the client at
    // module load threw during `next build` (no env present), which broke
    // building modules that merely import this one — e.g. the metadata image
    // routes. Deferring construction keeps request-time behaviour identical.
    throw new Error(
      "Supabase server client is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/**
 * Server-only Supabase client using the service-role key. It bypasses RLS, so it
 * must NEVER be imported into a client component — the `server-only` import above
 * turns any such import into a build error.
 *
 * Lazily constructed on first property access (see getClient) so importing this
 * module never requires env; it's still built once and reused. All privileged
 * writes (submit, rate, flag) and reads that must see unapproved rows
 * (moderation) go through this client.
 */
export const supabaseServer = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const c = getClient();
    const value = Reflect.get(c as object, prop, receiver);
    return typeof value === "function" ? value.bind(c) : value;
  },
});
