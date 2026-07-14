import { NextResponse } from "next/server";

const PREMIUM_FEATURES = {
  existing: [
    "Import Helper Tool - Automatically convert recipes from websites, PDFs or images to the correct format to import them -> will come to free too",
    "Several small to big UX / UI improvements",
    "Haptic feedback for several components",
  ],
  immediate: [
    "Accounts",
    "Finish Translations for free & premium",
    "Tighten security for export/import (only allowed format (strip rest to ensure future compatibility), escaping if not automatically done) *free version too*",
    "See the status of your published recipes (waiting for approval, approved, rejected)",
    "Export recipes as PDF",
  ],
  midterm: [
    "Improve add recipe screen",
    "Select which recipes and tags to import",
    "Add custom themes (+ option for sharing these easily, json, maybe qr later on)",
    "For first time recipes option instead of timer a stopwatch, to get time (or average times) for this step",
    "Auto-select Catppuccin accent closest to material you primary color",
    "Add counter for how many times a recipe was finished, most liked chef form online hub etc",
    "Add more languages",
  ],
  future: [
    "Meal planner screen",
    "Improved import helper tool, right in the app",
    "Sync -> can be used on laptop / PC as well",
    "Accounts -> simpler sync, create shared meal planning calendars, family groups",
    "Addition to ingredients screen: if you track what you have at home, when planning meals, or about to cook, shows which ingredients are missing",
    "If you have more features you would like to see, just ping me at 'kurt.schambach@gmail.com'",
  ],
};

export async function GET() {
  return NextResponse.json(
    { ...PREMIUM_FEATURES, released: false },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
