import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getClientIpHash, isUuid, readJsonBody } from "@/lib/request-utils";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { withApiHandler } from "@/lib/api-handler";
import { findHubRecipe } from "@/lib/hub-recipes";

export const POST = withApiHandler(async (request) => {
  const rl = await checkRateLimit(request, "flag-recipe");
  if (!rl.ok) return rateLimited(rl.retryAfter);

  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const id = parsed.body.id;

  if (!isUuid(id)) {
    return NextResponse.json(
      { error: "Missing or invalid id parameter" },
      { status: 400 },
    );
  }

  // Verify the recipe exists first so a valid-but-unknown UUID returns 404
  // instead of a 500 from the RPC's foreign-key violation (matches rate-recipe).
  const lookup = await findHubRecipe(id);
  if ("error" in lookup) {
    return NextResponse.json({ error: "Failed to flag recipe" }, { status: 500 });
  }
  if (!lookup.found) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  // Increment flag count, de-duplicated per client IP (DB-side).
  const { data, error } = await supabaseServer.rpc("increment_recipe_flag", {
    p_recipe_id: id,
    p_ip_hash: getClientIpHash(request),
  });

  if (error) {
    console.error("Error flagging recipe:", error);
    return NextResponse.json(
      { error: "Failed to update flag count" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    flags: data,
  });
});
