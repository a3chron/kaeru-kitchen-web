import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getClientIpHash, isUuid, readJsonBody } from "@/lib/request-utils";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { withApiHandler } from "@/lib/api-handler";
import { findHubRecipe } from "@/lib/hub-recipes";

const MAX_COMMENT_LENGTH = 2000;

export const POST = withApiHandler(async (request) => {
  const rl = await checkRateLimit(request, "rate-recipe");
  if (!rl.ok) return rateLimited(rl.retryAfter);

  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const { recipe_id, rating, comment } = parsed.body;

  if (!isUuid(recipe_id)) {
    return NextResponse.json(
      { error: "Missing or invalid recipe_id" },
      { status: 400 },
    );
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Rating must be an integer from 1 to 5" },
      { status: 400 },
    );
  }

  if (
    comment != null &&
    (typeof comment !== "string" || comment.length > MAX_COMMENT_LENGTH)
  ) {
    return NextResponse.json({ error: "Invalid comment" }, { status: 400 });
  }

  // Only allow rating recipes that exist and are approved.
  const lookup = await findHubRecipe(recipe_id, { approvedOnly: true });
  if ("error" in lookup) {
    return NextResponse.json(
      { error: "Failed to submit rating" },
      { status: 500 },
    );
  }
  if (!lookup.found) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const { error } = await supabaseServer.from("recipe_reviews").insert({
    recipe_id,
    rating,
    comment: typeof comment === "string" ? comment.trim() || null : null,
    ip_hash: getClientIpHash(request),
  });

  if (error) {
    // Unique-violation on (recipe_id, ip_hash) => already rated.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "You have already rated this recipe" },
        { status: 409 },
      );
    }
    console.error("Error inserting review:", error);
    return NextResponse.json(
      { error: "Failed to submit rating" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
});
