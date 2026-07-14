import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { supabaseServer } from "@/lib/supabase-server";
import { withApiHandler } from "@/lib/api-handler";

/** Constant-time bearer-token check against MODERATION_API_KEY. */
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.MODERATION_API_KEY;
  if (!expected) return false; // fail closed (handled as 503 by caller)

  const header = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;
  const provided = header.slice(prefix.length);

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const GET = withApiHandler(async (request) => {
  if (!process.env.MODERATION_API_KEY) {
    // No moderation key configured — refuse rather than expose the data.
    return NextResponse.json(
      { error: "Moderation endpoint not configured" },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from("recipes_hub")
    .select("*")
    .gt("flags", 0)
    .order("flags", { ascending: false });

  if (error) {
    console.error("Error fetching flagged recipes:", error);
    return NextResponse.json(
      { error: "Failed to fetch flagged recipes" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    count: data?.length || 0,
    recipes: data || [],
  });
});
