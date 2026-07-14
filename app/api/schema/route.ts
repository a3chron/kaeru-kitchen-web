import { NextResponse } from "next/server";
import { CURRENT_SCHEMA_VERSION, RECIPE_CATEGORIES } from "@/lib/constants";

export async function GET() {
  return NextResponse.json(
    {
      currentSchemaVersion: CURRENT_SCHEMA_VERSION,
      exampleRecipe: {
        title: "Example Recipe",
        description: "A short optional introduction to the dish (schema v3).",
        servings: 2,
        category: "dinner",
        tags: ["quick", "healthy"],
        nutrition: {
          per100g: { calories: 120, protein: 4, fat: 5, carbs: 14 },
          portionWeight: 350,
        },
        steps: [
          {
            name: "Prepare ingredients",
            order: 1,
            description: "Wash and chop all vegetables.",
            duration: 10,
            ingredients: [
              { name: "tomato", unit: "g", quantity: 200 },
              { name: "onion", unit: "g", quantity: 100 },
            ],
          },
        ],
        version: "1.0.0",
        schemaVersion: CURRENT_SCHEMA_VERSION,
      },
      validCategories: RECIPE_CATEGORIES,
      changelog: [
        {
          version: 1,
          description: "Initial schema: title, servings, category, steps, tags",
        },
        {
          version: 2,
          description: "Added drink category, schemaVersion field",
        },
        {
          version: 3,
          description:
            "Added optional nutrition info (per100g, portionWeight) and description field",
        },
      ],
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
