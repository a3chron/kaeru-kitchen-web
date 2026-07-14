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

  // 5. Pagination (page is 0-based, clamped)
  const safePage = clampPage(Math.floor(Number(page) || 0));
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
