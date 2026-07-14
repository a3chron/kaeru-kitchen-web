"use server";

import { FilterState } from "@/components/filters";
import { supabaseServer } from "@/lib/supabase-server";
import { RECIPES_PAGE_SIZE, clampPage } from "@/lib/constants";
import { checkRateLimitForAction } from "@/lib/rate-limit";
import { HubRecipeRow } from "@/types/recipe";

export async function fetchRecipes(
  filters: FilterState,
  page = 0,
): Promise<HubRecipeRow[]> {
  // Server actions have no NextRequest, so the limiter reads headers() itself.
  // Reads fail open (unconfigured/errored limiter allows); a genuine limit hit
  // throws, which the client's fetchRecipes().catch() surfaces as an error.
  const rl = await checkRateLimitForAction("fetch-recipes", "read");
  if (!rl.ok) throw new Error("Rate limited");

  const safePage = clampPage(Math.floor(Number(page) || 0));
  const searchText = (filters.query ?? "").trim().slice(0, 200);

  // With a search term, use the same fuzzy-search RPC the mobile /api/get-recipes
  // uses, so web search results match the app. The RPC re-validates/clamps all
  // arguments internally.
  if (searchText) {
    const { data, error } = await supabaseServer.rpc("fuzzy_search_recipes", {
      search_text: searchText,
      category_filter: filters.category,
      language_filter: filters.language,
      cooking_filter: filters.cookingTime,
      sort_by: filters.sortBy,
      limit_count: RECIPES_PAGE_SIZE,
      offset_count: safePage * RECIPES_PAGE_SIZE,
    });
    if (error) {
      console.error("Error searching recipes:", error);
      throw new Error("Failed to fetch recipes");
    }
    return (data as HubRecipeRow[] | null) || [];
  }

  let query = supabaseServer
    .from("recipes_hub")
    .select("*")
    .eq("is_approved", true);

  // 1. Category Filter
  if (filters.category !== "all") {
    query = query.eq("category", filters.category);
  }

  // 2. Language Filter
  if (filters.language !== "all") {
    query = query.eq("language", filters.language);
  }

  // 3. Cooking Time Filter (buckets are de-overlapped; 30 belongs only to 0-30)
  if (filters.cookingTime !== "all") {
    if (filters.cookingTime === "0-30") {
      query = query.lte("total_cooking_time", 30);
    } else if (filters.cookingTime === "30-60") {
      query = query.gt("total_cooking_time", 30).lte("total_cooking_time", 60);
    } else if (filters.cookingTime === "60+") {
      query = query.gt("total_cooking_time", 60);
    }
  }

  // 4. Sorting
  if (filters.sortBy === "reviews") {
    query = query
      .order("average_review", { ascending: false })
      .order("review_count", { ascending: false });
  } else if (filters.sortBy === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  // Stable tiebreaker so offset paging can't skip or duplicate rows.
  query = query.order("id", { ascending: false });

  // 5. Pagination (page is 0-based, clamped; safePage computed above)
  const from = safePage * RECIPES_PAGE_SIZE;
  const to = from + RECIPES_PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching recipes:", error);
    // Surface the failure so the UI can distinguish "error" from "no results".
    throw new Error("Failed to fetch recipes");
  }
  return (data as HubRecipeRow[] | null) || [];
}

/**
 * Distinct languages that actually have approved recipes on the hub, as
 * {code,label}. Powers the filter-bar language dropdown so it lists only
 * languages with content instead of all ~184 ISO codes (which mostly yield an
 * empty result).
 */
export async function getAvailableLanguages(): Promise<
  { code: string; label: string }[]
> {
  const rl = await checkRateLimitForAction("get-languages", "read");
  if (!rl.ok) return [];

  const { data, error } = await supabaseServer
    .from("recipes_hub")
    .select("language")
    .eq("is_approved", true)
    .limit(5000);

  if (error || !data) {
    if (error) console.error("Error loading languages:", error);
    return [];
  }

  const codes = Array.from(
    new Set(
      data
        .map((r) => (r as { language: string | null }).language)
        .filter((l): l is string => !!l),
    ),
  );

  const ISO6391 = (await import("iso-639-1")).default;
  return codes
    .map((code) => {
      const name = ISO6391.getName(code);
      const nativeName = ISO6391.getNativeName(code);
      return {
        code,
        label: name ? `${name} (${nativeName})` : code,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}
