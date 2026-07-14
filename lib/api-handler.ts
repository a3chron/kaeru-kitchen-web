import { NextRequest, NextResponse } from "next/server";

/**
 * Wraps a route handler in the standard try/catch that every hub API route
 * currently repeats: any thrown error is logged as `"API error:"` and turned
 * into a generic `500 { error: "Internal server error" }` so implementation
 * details never leak to the client.
 *
 * Purely a convenience for the top-level catch — handlers should still return
 * their own specific 4xx/5xx responses for expected failures (validation, not
 * found, upstream errors). Only genuinely unexpected throws land here.
 *
 * The second `ctx` param mirrors Next's route-context argument (e.g. the
 * `{ params }` bag for dynamic routes), so both static and dynamic handlers can
 * be wrapped without losing their signature.
 */
export function withApiHandler<Ctx = unknown>(
  fn: (request: NextRequest, ctx: Ctx) => Promise<Response>,
): (request: NextRequest, ctx: Ctx) => Promise<Response> {
  return async (request, ctx) => {
    try {
      return await fn(request, ctx);
    } catch (error) {
      console.error("API error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}
