import { NextResponse } from "next/server";
import { isUuid } from "@/lib/request-utils";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { withApiHandler } from "@/lib/api-handler";
import { fetchRecipeById, HUB_PUBLIC_COLUMNS } from "@/app/app/recipe-data";
import { HubRecipeRow } from "@/types/recipe";

export const GET = withApiHandler(async (request) => {
  const rl = await checkRateLimit(request, "get-hub-recipe", "read");
  if (!rl.ok) return rateLimited(rl.retryAfter);

  const id = request.nextUrl.searchParams.get("id");

  if (!isUuid(id)) {
    return NextResponse.json(
      { error: "Missing or invalid id parameter" },
      { status: 400 },
    );
  }

  // Shared single-fetch helper: explicit public columns (no flags/is_approved),
  // approved-only, throws on a real DB error (mapped to 500 by withApiHandler).
  const recipe = await fetchRecipeById<HubRecipeRow>("recipes_hub", id, {
    approvedOnly: true,
    columns: HUB_PUBLIC_COLUMNS,
  });

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, recipe });
});
