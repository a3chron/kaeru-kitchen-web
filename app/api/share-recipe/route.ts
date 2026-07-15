import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getTotalCookingTime } from "@/lib/utils";
import { sanitizeRecipe, validateRecipeData } from "@/lib/validate-recipe";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request-utils";
import { withApiHandler } from "@/lib/api-handler";

export const POST = withApiHandler(async (request) => {
  const rl = await checkRateLimit(request, "share-recipe", "share");
  if (!rl.ok) return rateLimited(rl.retryAfter);

  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: parsed.status },
    );
  }
  const { recipe, author } = parsed.body;

  // Validate author (optional for shared recipes, but bounded if present)
  if (
    author != null &&
    (typeof author !== "string" || author.trim().length > 100)
  ) {
    return NextResponse.json(
      { error: "Invalid author field" },
      { status: 400 },
    );
  }

  // Validate single recipe (wrap in array for validation function)
  if (!recipe || !validateRecipeData([recipe])) {
    return NextResponse.json(
      { error: "Invalid recipe data format" },
      { status: 400 },
    );
  }

  // Rebuild from an allowlist so no attacker-supplied extra keys are stored.
  const clean = sanitizeRecipe(recipe);
  const recipeToInsert = {
    recipe_data: clean,
    title: clean.title,
    servings: clean.servings,
    category: clean.category,
    // Empty/whitespace author is stored as null (single representation of
    // "no author" — see types/recipe.ts), never as "".
    author: typeof author === "string" && author.trim() ? author.trim() : null,
    total_cooking_time: getTotalCookingTime(clean),
  };

  // Insert into recipes_shared table
  const { data, error } = await supabaseServer
    .from("recipes_shared")
    .insert([recipeToInsert])
    .select("id")
    .single();

  if (error) {
    console.error("Supabase error:", error);
    return NextResponse.json(
      { error: "Failed to insert recipe into database" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Recipe was not inserted" },
      { status: 500 },
    );
  }

  // Return the ID of the inserted recipe
  return NextResponse.json(
    {
      success: true,
      id: data.id,
    },
    { status: 201 },
  );
});
