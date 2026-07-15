import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getTotalCookingTime } from "@/lib/utils";
import { sanitizeRecipe, validateRecipeData } from "@/lib/validate-recipe";
import { isValidLanguage, readJsonBody } from "@/lib/request-utils";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { withApiHandler } from "@/lib/api-handler";

const MAX_RECIPES_PER_REQUEST = 20;

export const POST = withApiHandler(async (request) => {
  const rl = await checkRateLimit(request, "add-recipe", "publish");
  if (!rl.ok) return rateLimited(rl.retryAfter);

  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: parsed.status },
    );
  }
  const body = parsed.body;
  const { author, language } = body;

  // Accept either a single { recipe } (mobile app) or { recipes: [] } (web form).
  const recipes = Array.isArray(body.recipes)
    ? body.recipes
    : body.recipe != null
      ? [body.recipe]
      : null;

  if (!recipes || recipes.length === 0) {
    return NextResponse.json({ error: "No recipe provided" }, { status: 400 });
  }

  if (recipes.length > MAX_RECIPES_PER_REQUEST) {
    return NextResponse.json(
      { error: `At most ${MAX_RECIPES_PER_REQUEST} recipes per request` },
      { status: 400 },
    );
  }

  if (!author || typeof author !== "string" || !author.trim()) {
    return NextResponse.json(
      { error: "Author name is required" },
      { status: 400 },
    );
  }

  if (author.trim().length > 100) {
    return NextResponse.json(
      { error: "Author name must be 100 characters or fewer" },
      { status: 400 },
    );
  }

  if (!isValidLanguage(language) || language === "all") {
    return NextResponse.json(
      { error: "A valid language code is required" },
      { status: 400 },
    );
  }

  if (!validateRecipeData(recipes)) {
    return NextResponse.json(
      { error: "Invalid recipe data format" },
      { status: 400 },
    );
  }

  const rowsToInsert = recipes.map((recipe) => {
    // Rebuild from an allowlist so no attacker-supplied extra keys are stored.
    const clean = sanitizeRecipe(recipe);
    return {
      recipe_data: clean,
      title: clean.title,
      category: clean.category,
      author: author.trim(),
      language,
      total_cooking_time: getTotalCookingTime(clean),
      // Auto-approve on submit; moderation is reactive via flagging. Kept
      // server-controlled (never read from the body) so a client can't forge
      // it — set false here if you ever want a pre-approval queue.
      is_approved: true,
    };
  });

  const { data, error } = await supabaseServer
    .from("recipes_hub")
    .insert(rowsToInsert)
    .select("id");

  if (error) {
    console.error("Supabase error:", error);
    return NextResponse.json(
      { error: "Failed to insert recipe into database" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      success: true,
      ids: data?.map((r) => r.id) ?? [],
      count: data?.length ?? 0,
    },
    { status: 201 },
  );
});
