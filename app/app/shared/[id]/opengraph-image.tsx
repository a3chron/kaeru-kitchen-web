import { ImageResponse } from "next/og";
import { OgCard } from "@/lib/og-card";
import { fetchRecipeById } from "@/app/app/recipe-data";
import type { SharedRecipeRow } from "@/types/recipe";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Shared recipe on Kaeru's Kitchen Hub";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let title = "Shared recipe";
  try {
    const recipe = await fetchRecipeById<SharedRecipeRow>(
      "recipes_shared",
      id,
      {
        columns: "id, title",
      },
    );
    if (recipe?.title) title = recipe.title;
  } catch {
    // Fall back to the generic title if the lookup fails.
  }
  return new ImageResponse(
    <OgCard title={title} subtitle="Shared on Kaeru's Kitchen Hub" />,
    { ...size },
  );
}
