import "server-only";
import { cache } from "react";
import { supabaseServer } from "@/lib/supabase-server";
import { isUuid } from "@/lib/request-utils";
import { checkRateLimitForAction } from "@/lib/rate-limit";
import { HubRecipeRow, SharedRecipeRow } from "@/types/recipe";

/**
 * Single-recipe fetch shared by the hub and shared detail pages.
 *
 * These are NOT server actions (no "use server"): they're server-only data
 * loaders imported by Server Components, which lets them be wrapped in React
 * `cache()` below. Each recipe detail page calls its loader twice per request —
 * once in the page and once in `generateMetadata` — so the `cache()` wrappers
 * dedupe that into a single DB round-trip (and a single rate-limit charge).
 *
 * Returns null only when the row is genuinely absent (or the id isn't a UUID); a
 * real DB error THROWS so the caller can distinguish "not found" (→ notFound())
 * from "backend down" (→ error boundary) instead of rendering a misleading 404
 * during a transient outage.
 */
async function fetchRecipeById<T extends HubRecipeRow | SharedRecipeRow>(
  table: "recipes_hub" | "recipes_shared",
  id: string,
  opts: { approvedOnly?: boolean } = {},
): Promise<T | null> {
  if (!isUuid(id)) return null;

  let query = supabaseServer.from(table).select("*").eq("id", id);
  if (opts.approvedOnly) query = query.eq("is_approved", true);

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error(`Error fetching recipe from ${table}:`, error);
    throw new Error("Failed to fetch recipe");
  }
  return (data as T | null) ?? null;
}

export const getRecipe = cache(
  async (id: string): Promise<HubRecipeRow | null> => {
    // Read limiter fails open when unconfigured/errored; only a genuine
    // rate-limit hit throws, landing on the error boundary (a transient state).
    const rl = await checkRateLimitForAction("get-recipe", "read");
    if (!rl.ok) throw new Error("Rate limited");
    return fetchRecipeById<HubRecipeRow>("recipes_hub", id, {
      approvedOnly: true,
    });
  },
);

export const getSharedRecipe = cache(
  async (id: string): Promise<SharedRecipeRow | null> => {
    const rl = await checkRateLimitForAction("get-shared-recipe", "read");
    if (!rl.ok) throw new Error("Rate limited");
    return fetchRecipeById<SharedRecipeRow>("recipes_shared", id);
  },
);
