import { RECIPE_CATEGORIES } from "@/lib/constants";
import type {
  Recipe,
  RecipeCategoryType,
  RecipeNutrition,
} from "@/types/recipe";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return value != null && typeof value === "object";
}

// Finite-range check: `typeof x === "number"` alone lets NaN/Infinity through
// (and JSON.stringify would re-serve Infinity as null to every client).
function inRange(x: unknown, min: number, max: number): boolean {
  return typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;
}

function isValidNutrition(nutrition: unknown): nutrition is RecipeNutrition {
  if (!isRecord(nutrition)) return false;
  const { per100g, portionWeight } = nutrition;
  if (!isRecord(per100g)) return false;
  if (
    !inRange(per100g.calories, 0, 10000) ||
    !inRange(per100g.protein, 0, 1000) ||
    !inRange(per100g.fat, 0, 1000) ||
    !inRange(per100g.carbs, 0, 1000)
  )
    return false;
  if (per100g.sugar != null && !inRange(per100g.sugar, 0, 1000)) return false;
  if (per100g.fiber != null && !inRange(per100g.fiber, 0, 1000)) return false;
  if (
    portionWeight != null &&
    (typeof portionWeight !== "number" ||
      !inRange(portionWeight, 0, 100000) ||
      portionWeight <= 0)
  )
    return false;
  return true;
}

function isValidRecipe(recipe: unknown): recipe is Recipe {
  return (
    isRecord(recipe) &&
    typeof recipe.title === "string" &&
    recipe.title.trim().length > 0 &&
    recipe.title.length <= 500 &&
    typeof recipe.version === "string" &&
    recipe.version.length <= 50 &&
    // Integer: recipes_shared.servings is an integer column — a fractional
    // value would pass here and then 500 on the insert cast.
    Number.isInteger(recipe.servings) &&
    (recipe.servings as number) > 0 &&
    (recipe.servings as number) <= 1000 &&
    RECIPE_CATEGORIES.includes(recipe.category as RecipeCategoryType) &&
    // Optional description
    (recipe.description == null ||
      (typeof recipe.description === "string" &&
        recipe.description.length <= 5000)) &&
    // Optional nutrition
    (recipe.nutrition == null || isValidNutrition(recipe.nutrition)) &&
    // Steps (at least one, capped)
    Array.isArray(recipe.steps) &&
    recipe.steps.length >= 1 &&
    recipe.steps.length <= 100 &&
    recipe.steps.every(
      (step) =>
        isRecord(step) &&
        typeof step.name === "string" &&
        step.name.length <= 500 &&
        inRange(step.order, 0, 100) &&
        typeof step.description === "string" &&
        step.description.length <= 10000 &&
        typeof step.duration === "number" &&
        step.duration >= 0 &&
        step.duration <= 10000 &&
        Array.isArray(step.ingredients) &&
        step.ingredients.length <= 50 &&
        step.ingredients.every(
          (ingredient) =>
            isRecord(ingredient) &&
            typeof ingredient.name === "string" &&
            ingredient.name.length <= 200 &&
            (ingredient.unit == null ||
              (typeof ingredient.unit === "string" &&
                ingredient.unit.length <= 50)) &&
            (ingredient.quantity == null ||
              inRange(ingredient.quantity, 0, 1000000)),
        ),
    ) &&
    // Optional tags
    (!recipe.tags ||
      (Array.isArray(recipe.tags) &&
        recipe.tags.length <= 50 &&
        recipe.tags.every((t) => typeof t === "string" && t.length <= 100)))
  );
}

export function validateRecipeData(data: unknown): data is Recipe[] {
  if (!Array.isArray(data)) return false;
  return data.every(isValidRecipe);
}

/**
 * Rebuild a recipe from an allowlist of known schema fields. Must run only on
 * data that already passed validateRecipeData. Untrusted payloads may carry
 * extra keys (arbitrary junk, oversized blobs, prototype-pollution attempts);
 * storing the raw object would persist and re-serve them to every client. This
 * returns a clean object safe to store as recipe_data.
 */
export function sanitizeRecipe(r: Recipe): Recipe {
  return {
    title: r.title,
    ...(typeof r.description === "string"
      ? { description: r.description }
      : {}),
    servings: r.servings,
    category: r.category,
    version: r.version,
    ...(typeof r.schemaVersion === "number"
      ? { schemaVersion: r.schemaVersion }
      : {}),
    ...(Array.isArray(r.tags) ? { tags: r.tags.map((t) => String(t)) } : {}),
    ...(r.nutrition && typeof r.nutrition === "object"
      ? { nutrition: sanitizeNutrition(r.nutrition) }
      : {}),
    steps: r.steps.map((s) => ({
      name: s.name,
      order: s.order,
      description: s.description,
      duration: s.duration,
      ingredients: s.ingredients.map((i) => ({
        name: i.name,
        ...(i.unit !== undefined ? { unit: i.unit } : {}),
        ...(i.quantity !== undefined ? { quantity: i.quantity } : {}),
      })),
    })),
  };
}

function sanitizeNutrition(n: RecipeNutrition): RecipeNutrition {
  const p = n.per100g ?? {};
  return {
    per100g: {
      calories: p.calories,
      protein: p.protein,
      fat: p.fat,
      carbs: p.carbs,
      ...(p.sugar !== undefined ? { sugar: p.sugar } : {}),
      ...(p.fiber !== undefined ? { fiber: p.fiber } : {}),
    },
    ...(n.portionWeight !== undefined
      ? { portionWeight: n.portionWeight }
      : {}),
  };
}
