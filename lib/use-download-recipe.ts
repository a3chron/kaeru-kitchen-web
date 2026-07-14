import { useEffect, useState } from "react";
import type { Recipe } from "@/types/recipe";

const DOWNLOADS_KEY = "recipe_downloads";

function getDownloadedRecipes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(DOWNLOADS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function markAsDownloaded(recipeId: string): void {
  try {
    const downloads = getDownloadedRecipes();
    const id = recipeId.toString();
    if (!downloads.includes(id)) {
      downloads.push(id);
      localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(downloads));
    }
  } catch (e) {
    console.error("Failed to save download status:", e);
  }
}

/**
 * Encapsulates the "download this recipe as a .txt" flow: builds the export blob
 * (Kaeru's Kitchen expects an array), triggers the browser download with a
 * filesystem-safe filename, and tracks the per-recipe "downloaded" flag in
 * localStorage (restored on mount).
 */
export function useDownloadRecipe(recipeData: Recipe, id: string) {
  const [hasDownloaded, setHasDownloaded] = useState(false);

  useEffect(() => {
    setHasDownloaded(getDownloadedRecipes().includes(id.toString()));
  }, [id]);

  const handleDownload = () => {
    // Kaeru's Kitchen expects an array
    const recipeExportData = [recipeData];
    const jsonString = JSON.stringify(recipeExportData, null, 2);
    const blob = new Blob([jsonString], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeTitle = recipeData.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    a.href = url;
    a.download = `${safeTitle || "recipe"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Mark as downloaded
    markAsDownloaded(id);
    setHasDownloaded(true);
  };

  return { hasDownloaded, handleDownload };
}
