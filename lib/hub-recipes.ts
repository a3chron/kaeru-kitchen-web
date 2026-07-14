import "server-only";
import { supabaseServer } from "@/lib/supabase-server";

/**
 * Result of a hub-recipe existence check.
 * - `found: true`  — the row exists (and is approved, when `approvedOnly`).
 * - `found: false` — the lookup ran but no matching row exists (→ 404).
 * - `error: true`  — the DB lookup itself failed (→ 500).
 *
 * Mirrors the "select id, then branch on lookupError / missing row" pattern
 * duplicated in the flag-recipe and rate-recipe routes so callers can map each
 * case to the right HTTP status.
 */
export type FindHubRecipeResult =
  | { found: true }
  | { found: false }
  | { error: true };

/**
 * Check whether a recipe exists in `recipes_hub`, optionally requiring it to be
 * approved. Selects only `id` — this is an existence check, not a fetch. Uses
 * the server (service-role) supabase client so it can see unapproved rows when
 * `approvedOnly` is not set.
 */
export async function findHubRecipe(
  id: string,
  opts: { approvedOnly?: boolean } = {},
): Promise<FindHubRecipeResult> {
  let query = supabaseServer.from("recipes_hub").select("id").eq("id", id);
  if (opts.approvedOnly) query = query.eq("is_approved", true);

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("Error looking up recipe:", error);
    return { error: true };
  }
  return data ? { found: true } : { found: false };
}
