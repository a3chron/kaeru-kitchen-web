"use client";

import { useState, useEffect, useRef } from "react";
import { Recipe } from "@/types/recipe";
import { validateRecipeData } from "@/lib/validate-recipe";
import {
  DEFAULT_LANGUAGES,
  LanguageOption,
  loadLanguages,
} from "@/lib/languages";
import { useModalA11y } from "@/lib/use-modal-a11y";
import { X } from "lucide-react";

interface SubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export default function SubmitModal({
  isOpen,
  onClose,
  onSuccess,
}: SubmitModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [author, setAuthor] = useState("");
  const [language, setLanguage] = useState("");
  const [languages, setLanguages] =
    useState<LanguageOption[]>(DEFAULT_LANGUAGES);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadLanguages()
      .then(setLanguages)
      .catch((err) => console.error("Failed to load languages:", err));
  }, []);

  // Close on Escape while open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Focus management, focus trap, focus restore, body-scroll lock.
  useModalA11y(isOpen, dialogRef);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Single try/finally guarantees the button re-enables on every exit path.
    try {
      if (!author.trim()) {
        setError("Please enter your name or a nickname.");
        return;
      }

      if (!language) {
        setError("Please select a language.");
        return;
      }

      let recipeJson: Recipe[];
      try {
        recipeJson = JSON.parse(jsonText);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Invalid JSON: ${msg}. Please paste the export directly.`);
        return;
      }

      // Check for an empty/non-array payload BEFORE validateRecipeData, which
      // returns true for [] (vacuously) and would let an empty submit through.
      if (!Array.isArray(recipeJson) || recipeJson.length === 0) {
        setError(
          "No valid recipes found in the JSON. Check for title and steps.",
        );
        return;
      }

      // Client-side pre-check for instant feedback; the server re-validates.
      if (!validateRecipeData(recipeJson)) {
        setError(
          "Invalid recipe format. Please ensure all recipes have: title (string), " +
            "version (string), servings (number), valid category, and properly " +
            "formatted steps with ingredients.",
        );
        return;
      }

      const res = await fetch("/api/add-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipes: recipeJson,
          author: author.trim(),
          language,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "Submission failed. Please try again.");
        return;
      }

      setJsonText("");
      setAuthor("");
      setLanguage("");
      onSuccess(data.count ?? recipeJson.length);
    } catch {
      setError(
        "Submission failed. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ctp-overlay2/20 backdrop-blur-2xl"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-modal-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative bg-ctp-mantle w-full max-w-2xl max-h-[90dvh] overflow-y-auto p-6 rounded-xl shadow-2xl border border-ctp-surface0 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 text-ctp-subtext0 hover:text-ctp-text"
        >
          <X size={24} />
        </button>

        <h2
          id="submit-modal-title"
          className="text-2xl font-bold text-ctp-text mb-4"
        >
          Submit Your Recipe(s)
        </h2>
        <p className="text-ctp-subtext0 mb-6">
          Paste your Kaeru&apos;s Kitchen JSON export below. All recipes in the array
          will be published to the hub. <br />
          You can export your recipe as text in the app: <br />
          Settings {"->"} Export {"->"} (select recipes) {"->"} Show more
          options
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="author"
              className="block text-sm font-medium text-ctp-subtext1 mb-1"
            >
              Your Name
            </label>
            <input
              id="author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g., 'Chef John'"
              required
              className="w-full bg-ctp-surface0 border border-ctp-surface1 rounded-lg p-3 text-ctp-text focus:outline-none focus:ring-2 focus:ring-ctp-green focus:border-ctp-green"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="submit-language"
              className="block text-sm font-medium text-ctp-subtext1 mb-1"
            >
              Recipe Language
            </label>
            <select
              id="submit-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              required
              className="w-full bg-ctp-surface0 border border-ctp-surface1 rounded-lg p-3 text-ctp-text focus:outline-none focus:ring-2 focus:ring-ctp-green focus:border-ctp-green cursor-pointer"
            >
              <option value="">Select a language...</option>
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label
              htmlFor="json-input"
              className="block text-sm font-medium text-ctp-subtext1 mb-1"
            >
              Recipe JSON
            </label>
            <textarea
              id="json-input"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={10}
              placeholder='[ { "title": "Recipe 1", ... }, { "title": "Recipe 2", ... } ]'
              required
              className="w-full bg-ctp-surface0 border border-ctp-surface1 rounded-lg p-3 text-ctp-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ctp-green focus:border-ctp-green"
            />
          </div>

          {error && (
            <p role="alert" className="text-ctp-red mb-4 text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ctp-green text-ctp-base font-semibold px-4 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Submitting..." : "Submit Recipe"}
          </button>
        </form>
      </div>
    </div>
  );
}
