import { useEffect, useState } from "react";

const FLAG_KEY = "recipe_flags";

function getFlaggedRecipes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(FLAG_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function markAsFlagged(recipeId: string): void {
  try {
    const flags = getFlaggedRecipes();
    const id = recipeId.toString();
    if (!flags.includes(id)) {
      flags.push(id);
      localStorage.setItem(FLAG_KEY, JSON.stringify(flags));
    }
  } catch (e) {
    console.error("Failed to save flagged status:", e);
  }
}

/**
 * Encapsulates the "flag this recipe" fetch flow: guards against double
 * submission, POSTs to /api/flag-recipe, records the flagged flag in
 * localStorage (restored on mount), and surfaces an inline ok/error result.
 * `onSettled` runs in every terminal branch (used to close the flag modal).
 */
export function useFlagRecipe(id: string) {
  const [flagLoading, setFlagLoading] = useState(false);
  const [hasFlagged, setHasFlagged] = useState(false);
  const [flagResult, setFlagResult] = useState<null | "ok" | "error">(null);

  useEffect(() => {
    setHasFlagged(getFlaggedRecipes().includes(id.toString()));
  }, [id]);

  const handleFlag = (onSettled?: () => void) => {
    if (flagLoading) return; // guard against double submission
    setFlagLoading(true);
    fetch("/api/flag-recipe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
      }),
    })
      .then((resp) => {
        onSettled?.();
        if (!resp.ok) {
          setFlagResult("error");
        } else {
          markAsFlagged(id);
          setHasFlagged(true);
          setFlagResult("ok");
        }
      })
      .catch(() => {
        onSettled?.();
        setFlagResult("error");
      })
      .finally(() => setFlagLoading(false));
  };

  return { flagLoading, hasFlagged, flagResult, handleFlag };
}
