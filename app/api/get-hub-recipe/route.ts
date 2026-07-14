import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { isUuid } from "@/lib/request-utils";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { withApiHandler } from "@/lib/api-handler";

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

  const { data, error } = await supabaseServer
    .from("recipes_hub")
    .select("*")
    .eq("id", id)
    .eq("is_approved", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching recipe:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    recipe: data,
  });
});
