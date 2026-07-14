import type { RecipeCategoryType } from "@/lib/constants";
export type { RecipeCategoryType };

export interface Ingredient {
  name: string;
  // Optional: validation/sanitization allow an ingredient with no unit/quantity,
  // and consumers already treat these as possibly absent.
  unit?: string;
  quantity?: number;
}

export interface Step {
  name: string;
  order: number;
  description: string;
  ingredients: Ingredient[];
  duration: number; // Duration in minutes
}

export interface RecipeNutrition {
  per100g: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    sugar?: number;
    fiber?: number;
  };
  portionWeight?: number;
}

export interface Recipe {
  title: string;
  description?: string;
  servings: number;
  category: RecipeCategoryType;
  steps: Step[];
  nutrition?: RecipeNutrition;
  version: string;
  schemaVersion?: number;
  tags?: string[];
  createdAt?: string;
}

/**
 * Columns common to both recipe tables (recipes_hub and recipes_shared),
 * per db/schema.ts. `author` is nullable; `total_cooking_time` has a NOT NULL
 * default so it is always present.
 */
interface BaseRecipeRow {
  id: string;
  created_at: string;
  recipe_data: Recipe; // The full JSON blob
  title: string;
  category: RecipeCategoryType;
  author: string | null;
  total_cooking_time: number;
}

/**
 * A row from `recipes_hub` (the public, moderated hub feed). All hub-only
 * columns (language / moderation flags / review aggregates) are NOT NULL with
 * defaults, so they are always present on a fetched row.
 */
export interface HubRecipeRow extends BaseRecipeRow {
  language: string;
  is_approved: boolean;
  flags: number;
  average_review: number;
  review_count: number;
}

/**
 * A row from `recipes_shared` (temporary link-shared recipes). Has no
 * language/moderation/review columns; `servings` is a nullable top-level column.
 */
export interface SharedRecipeRow extends BaseRecipeRow {
  servings: number | null;
}

/**
 * Either recipe-row shape. Prefer the precise `HubRecipeRow` / `SharedRecipeRow`
 * at call sites where the source table is known; this union remains for the few
 * places that genuinely handle both.
 */
export type RecipeFromDB = HubRecipeRow | SharedRecipeRow;
