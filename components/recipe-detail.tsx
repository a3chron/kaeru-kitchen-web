"use client";

import { getAllIngredients, getTotalCookingTime } from "@/lib/utils";
import { HubRecipeRow, SharedRecipeRow } from "@/types/recipe";
import { useDownloadRecipe } from "@/lib/use-download-recipe";
import { useFlagRecipe } from "@/lib/use-flag-recipe";
import {
  ArrowLeft,
  Clock,
  Download,
  Star,
  User,
  Users,
  Flag,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import FlagModal from "./flag-modal";

// Discriminated on `shared`: hub pages render a HubRecipeRow (with review /
// language / moderation columns), shared pages render a SharedRecipeRow.
type RecipeDetailProps =
  | { recipe: HubRecipeRow; shared?: false }
  | { recipe: SharedRecipeRow; shared: true };

export default function RecipeDetail(props: RecipeDetailProps) {
  const { recipe, shared } = props;
  // Hub-only view: null for shared recipes, so hub-only columns
  // (language / average_review / review_count) are only read when present.
  const hub: HubRecipeRow | null = props.shared ? null : props.recipe;

  const { recipe_data, author, id } = recipe;
  const allIngredients = getAllIngredients(recipe_data);
  const totalTime = getTotalCookingTime(recipe_data);
  // Copy before sorting — never mutate the prop's array during render.
  const sortedSteps = [...recipe_data.steps].sort((a, b) => a.order - b.order);

  const { hasDownloaded, handleDownload } = useDownloadRecipe(recipe_data, id);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const { flagLoading, hasFlagged, flagResult, handleFlag } = useFlagRecipe(id);

  return (
    <>
      <div
        lang={hub?.language || undefined}
        className="bg-ctp-mantle rounded-xl border border-ctp-surface0 p-6 md:p-8"
      >
        {/* Back Button */}
        <Link
          href={shared ? "/app" : "/app/hub"}
          className="flex items-center gap-2 text-ctp-subtext1 hover:text-ctp-text mb-6 font-semibold"
        >
          <ArrowLeft size={18} />
          {shared ? "Home" : "Back to Hub"}
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold text-ctp-text break-words">
              {recipe_data.title}
            </h1>
            {/* Review aggregate. Hidden until at least one review exists, so a
                recipe with no ratings doesn't show a "0 reviews" line that reads
                as broken. (Ratings submission isn't wired up on any client yet.) */}
            {hub && (hub.review_count ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 text-ctp-subtext0 mt-2">
                <Star size={16} className="text-ctp-yellow" />
                <span>
                  {`${hub.average_review.toFixed(1)} (${hub.review_count ?? 0} reviews)`}
                </span>
              </div>
            )}
          </div>
          {/* Flag button */}
          {!shared && !hasFlagged && (
            <div className="flex flex-row gap-2">
              <button
                onClick={() => setFlagModalOpen(true)}
                aria-label="Flag this recipe"
                className="flex-shrink-0 flex items-center justify-center gap-2 font-semibold px-4 py-2 rounded-lg transition-colors border border-ctp-surface1 bg-ctp-surface0 text-ctp-red hover:bg-ctp-red hover:text-ctp-base focus-visible:outline-2 focus-visible:outline-ctp-blue"
              >
                <Flag />
              </button>
            </div>
          )}
        </div>

        {/* Flag result feedback (inline, replaces blocking alert) */}
        {flagResult && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-4 rounded-lg px-4 py-2 text-sm ${
              flagResult === "ok"
                ? "bg-ctp-surface0 text-ctp-subtext1"
                : "bg-ctp-red/15 text-ctp-red"
            }`}
          >
            {flagResult === "ok"
              ? "Thanks — we'll review this recipe as soon as possible."
              : "Couldn't flag this recipe. Please try again later."}
          </div>
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap gap-x-6 gap-y-3 my-6 text-ctp-subtext0">
          <span className="flex items-center gap-2">
            <User size={18} />
            By {author || "Anonymous"}
          </span>
          <span className="flex items-center gap-2">
            <Clock size={18} />
            {totalTime} min
          </span>
          <span className="flex items-center gap-2">
            <Users size={18} />
            {recipe_data.servings || "N/A"} servings
          </span>
          <span className="capitalize px-3 py-1 bg-ctp-green text-ctp-base rounded-full text-sm font-semibold">
            {recipe_data.category}
          </span>
        </div>

        {/* Description (optional, added in schema v3) */}
        {recipe_data.description && (
          <p className="text-ctp-text whitespace-pre-line break-words mb-6">
            {recipe_data.description}
          </p>
        )}

        {/* Ingredients & Steps Container */}
        <div className="flex flex-col lg:flex-row gap-8 mt-8">
          {/* All Ingredients */}
          <div className="w-full lg:w-1/3 lg:sticky top-24 self-start bg-ctp-surface0 p-6 rounded-lg">
            <h2 className="text-xl font-bold text-ctp-green mb-4">
              Ingredients
            </h2>
            <ul className="space-y-2">
              {allIngredients.map((ing, idx) => (
                <li key={idx} className="flex gap-2 text-ctp-text">
                  <span className="text-ctp-subtext0"> • </span>
                  <span className="min-w-0 break-words">
                    {ing.quantity || ""} {ing.unit || ""} {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Steps */}
          <div className="w-full lg:w-2/3">
            <h2 className="text-xl font-bold text-ctp-green mb-4">
              Instructions
            </h2>
            <div className="space-y-6">
              {sortedSteps.map((step, idx) => (
                <div
                  key={`${step.order}-${idx}`}
                  className="pb-6 border-b border-ctp-surface1 last:border-b-0"
                >
                  <h3 className="text-lg font-semibold text-ctp-text mb-2 break-words">
                    Step {step.order}: {step.name}
                  </h3>
                  {step.duration > 0 && (
                    <p className="text-sm text-ctp-subtext1 mb-3">
                      ({step.duration} minutes)
                    </p>
                  )}
                  {/* Use whitespace-pre-line to respect newlines from the description */}
                  <p className="text-ctp-text whitespace-pre-line">
                    {step.description}
                  </p>

                  {step.ingredients.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-ctp-subtext0 mb-2">
                        Ingredients for this step:
                      </h4>
                      <ul className="list-disc list-inside text-sm text-ctp-subtext1 space-y-1">
                        {step.ingredients.map((ing, ingIdx) => (
                          <li key={ingIdx}>
                            {ing.quantity || ""} {ing.unit || ""} {ing.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Download Button */}
        <div className="mt-8 pt-6 border-t border-ctp-surface1">
          <button
            onClick={handleDownload}
            className={`flex items-center justify-center gap-2 w-full font-semibold px-4 py-3 rounded-lg transition-opacity hover:opacity-90 ${
              hasDownloaded
                ? "bg-ctp-surface0 text-ctp-text"
                : "bg-ctp-green text-ctp-base"
            }`}
          >
            <Download size={18} />
            {hasDownloaded ? "Downloaded — download again" : "Download .txt"}
          </button>
          <p className="mt-2 text-xs text-ctp-subtext0 text-center">
            Import the downloaded file in the app under Settings → Import.
          </p>
        </div>
      </div>

      {!shared && (
        <FlagModal
          isOpen={flagModalOpen}
          onClose={() => setFlagModalOpen(false)}
          onSubmit={() => handleFlag(() => setFlagModalOpen(false))}
          loading={flagLoading}
          recipeTitle={recipe.title}
        />
      )}
    </>
  );
}
