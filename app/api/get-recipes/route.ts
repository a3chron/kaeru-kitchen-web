import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { isValidLanguage } from "@/lib/request-utils";
import {
  CATEGORY_VALUES,
  COOKING_TIME_VALUES,
  SORT_VALUES,
  RECIPES_PAGE_SIZE,
  clampPage,
} from "@/lib/constants";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { withApiHandler } from "@/lib/api-handler";

// App-facing search endpoint: the paginated fuzzy-search feed consumed by the
// mobile apps' hub tab (the web grid uses the fetchRecipes server action). Keep
// it even if it looks unused from the web codebase.
export const GET = withApiHandler(async (request) => {
  const rl = await checkRateLimit(request, "get-recipes", "read");
  if (!rl.ok) return rateLimited(rl.retryAfter);

  const searchParams = request.nextUrl.searchParams;

  const rawSort = searchParams.get("sortBy") || "newest";
  const rawCategory = searchParams.get("category") || "all";
  const rawCooking = searchParams.get("cookingTime") || "all";
  const rawLanguage = searchParams.get("language") || "all";
  const rawQuery = searchParams.get("query")?.trim().slice(0, 200) || "";
  const page = clampPage(
    Number.parseInt(searchParams.get("page") ?? "0", 10) || 0,
  );

  const { data, error } = await supabaseServer.rpc("fuzzy_search_recipes", {
    search_text: rawQuery,
    category_filter: (CATEGORY_VALUES as string[]).includes(rawCategory)
      ? rawCategory
      : "all",
    language_filter: isValidLanguage(rawLanguage) ? rawLanguage : "all",
    cooking_filter: (COOKING_TIME_VALUES as string[]).includes(rawCooking)
      ? rawCooking
      : "all",
    sort_by: (SORT_VALUES as string[]).includes(rawSort) ? rawSort : "newest",
    limit_count: RECIPES_PAGE_SIZE,
    offset_count: page * RECIPES_PAGE_SIZE,
  });

  if (error) {
    console.error("Error fetching recipes:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 },
    );
  }

  const recipes = data || [];
  return NextResponse.json({
    success: true,
    recipes,
    count: recipes.length,
    page,
    pageSize: RECIPES_PAGE_SIZE,
    hasMore: recipes.length === RECIPES_PAGE_SIZE,
  });
});
