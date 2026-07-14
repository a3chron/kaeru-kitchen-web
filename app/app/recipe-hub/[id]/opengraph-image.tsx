import { ImageResponse } from "next/og";
import { OgCard } from "@/lib/og-card";
import { fetchRecipeById } from "@/app/app/recipe-data";
import type { HubRecipeRow } from "@/types/recipe";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Recipe on Kaeru's Kitchen Hub";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let title = "Recipe";
  try {
    const recipe = await fetchRecipeById<HubRecipeRow>("recipes_hub", id, {
      approvedOnly: true,
      columns: "id, title",
    });
    if (recipe?.title) title = recipe.title;
  } catch {
    // Fall back to the generic title if the lookup fails.
  }
  return new ImageResponse(
    <OgCard title={title} subtitle="On Kaeru's Kitchen Hub" />,
    { ...size },
  );
}
