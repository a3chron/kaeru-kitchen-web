/**
 * Recipe schema version — a cross-repo contract with the mobile apps'
 * lib/migrations.ts (v2 added the drink category, v3 optional nutrition +
 * description). Bump here and in the /api/schema changelog together.
 */
export const CURRENT_SCHEMA_VERSION = 3;

/**
 * Page size for the hub recipe grid and the /api/get-recipes endpoint.
 * Keep in sync with the clamp in `fuzzy_search_recipes` (db/policies.sql).
 */
export const RECIPES_PAGE_SIZE = 30;

/**
 * The fixed recipe categories — single source of truth. Mirrored in
 * db/schema.ts (SQL check constraint) which must be kept in sync manually.
 */
export const RECIPE_CATEGORIES = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "dessert",
  "drink",
] as const;

export type RecipeCategoryType = (typeof RECIPE_CATEGORIES)[number];

/**
 * Upper bound on the requested page so a client can't ask for an absurd deep
 * offset (scan/DoS vector). Single source for the clamp duplicated in
 * app/app/actions.ts and app/api/get-recipes/route.ts.
 */
export const MAX_PAGE = 1000;

/** Clamp a raw page value into the valid `[0, MAX_PAGE]` range. */
export function clampPage(raw: number): number {
  return Math.min(MAX_PAGE, Math.max(0, raw));
}

/**
 * Single source of truth for the recipe-list filter options. Both the
 * `<select>` menus in components/filters.tsx and the server-side allowlists in
 * app/api/get-recipes/route.ts (and the fetchRecipes action) should derive from
 * these so the client offering and the server acceptance can never drift.
 *
 * `SORT_OPTIONS` / `COOKING_TIME_OPTIONS` carry the human labels for the
 * `<option>`s; the `*_VALUES` arrays are the bare allowlists for validation.
 * Category options are derived from RECIPE_CATEGORIES (do not re-list them).
 */
export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "reviews", label: "Top Rated" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export const SORT_VALUES = SORT_OPTIONS.map((o) => o.value) as SortValue[];

export const COOKING_TIME_OPTIONS = [
  { value: "all", label: "Any time" },
  { value: "0-30", label: "≤ 30 min" },
  { value: "30-60", label: "30-60 min" },
  { value: "60+", label: "60+ min" },
] as const;

export type CookingTimeValue = (typeof COOKING_TIME_OPTIONS)[number]["value"];

export const COOKING_TIME_VALUES = COOKING_TIME_OPTIONS.map(
  (o) => o.value,
) as CookingTimeValue[];

/** Category filter values: "all" plus every fixed recipe category. */
export type CategoryValue = RecipeCategoryType | "all";

export const CATEGORY_VALUES = ["all", ...RECIPE_CATEGORIES] as CategoryValue[];

/**
 * URL schemes of the mobile apps that can open hub/shared deep links, in the
 * order they should be attempted. Free ships `nrecipe://`, premium
 * `nrecipe_premium://` (see the monorepo CLAUDE.md — both are intentional).
 */
export const APP_SCHEMES = ["nrecipe", "nrecipe_premium"] as const;

/** Play Store listings offered as the fallback when no app grabs the link. The
 *  hub serves both apps, so a visitor may want either. */
export const PLAY_STORE_URL_FREE =
  "https://play.google.com/store/apps/details?id=com.a3chron.nrecipe";
export const PLAY_STORE_URL_PREMIUM =
  "https://play.google.com/store/apps/details?id=com.a3chron.nrecipe_premium";
/** @deprecated Prefer PLAY_STORE_URL_FREE / PLAY_STORE_URL_PREMIUM. */
export const PLAY_STORE_URL = PLAY_STORE_URL_FREE;

/** Build a mobile deep link, e.g. deepLinkTo("nrecipe", `app/shared/${id}`). */
export function deepLinkTo(scheme: string, path: string): string {
  return `${scheme}:///${path}`;
}

/** Android application ids, paired with the schemes/stores above. */
export const APP_PACKAGE_FREE = "com.a3chron.nrecipe";
export const APP_PACKAGE_PREMIUM = "com.a3chron.nrecipe_premium";

/**
 * Android `intent://` URL that opens the app and, crucially, auto-redirects to
 * the Play Store (`browser_fallback_url`) when the app isn't installed — so the
 * "Open in app" button no longer dead-ends on a "can't open page" error. Only
 * meaningful on Android Chrome; callers fall back to `deepLinkTo` elsewhere.
 */
export function androidIntentUrl(
  scheme: string,
  packageName: string,
  path: string,
  fallbackUrl: string,
): string {
  return `intent://${path}#Intent;scheme=${scheme};package=${packageName};S.browser_fallback_url=${encodeURIComponent(
    fallbackUrl,
  )};end`;
}

/** Canonical site origin (no trailing slash). Used for metadata, sitemap, robots. */
export const SITE_URL = "https://kaeru-kitchen.vercel.app";
