"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { HubRecipeRow } from "@/types/recipe";
import {
  RECIPES_PAGE_SIZE,
  CATEGORY_VALUES,
  COOKING_TIME_VALUES,
  SORT_VALUES,
} from "@/lib/constants";
import Filters, { FilterState } from "@/components/filters";
import RecipeCard from "@/components/recipe-card";
import SubmitModal from "@/components/submit-modal";
import Header from "@/components/header";
import { fetchRecipes } from "../actions";

const DEFAULT_FILTERS: FilterState = {
  category: "all",
  cookingTime: "all",
  sortBy: "newest",
  language: "all",
  query: "",
};

// Read filter state from the URL, validating each value against its allowlist so
// a hand-edited URL can't inject an unexpected filter (language is validated
// server-side by the query, so any string is accepted here).
function readFilters(sp: ReadonlyURLSearchParams): FilterState {
  const category = sp.get("category") ?? "";
  const cookingTime = sp.get("cookingTime") ?? "";
  const sortBy = sp.get("sortBy") ?? "";
  return {
    category: (CATEGORY_VALUES as string[]).includes(category)
      ? (category as FilterState["category"])
      : "all",
    cookingTime: (COOKING_TIME_VALUES as string[]).includes(cookingTime)
      ? (cookingTime as FilterState["cookingTime"])
      : "all",
    sortBy: (SORT_VALUES as string[]).includes(sortBy)
      ? (sortBy as FilterState["sortBy"])
      : "newest",
    language: sp.get("language") || "all",
    query: (sp.get("q") || "").slice(0, 200),
  };
}

// Serialize non-default filters into a query string (defaults omitted to keep
// the URL clean and shareable).
function writeParams(filters: FilterState): string {
  const p = new URLSearchParams();
  if (filters.category !== "all") p.set("category", filters.category);
  if (filters.cookingTime !== "all") p.set("cookingTime", filters.cookingTime);
  if (filters.sortBy !== "newest") p.set("sortBy", filters.sortBy);
  if (filters.language !== "all") p.set("language", filters.language);
  if (filters.query) p.set("q", filters.query);
  return p.toString();
}

function HubContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [recipes, setRecipes] = useState<HubRecipeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [error, setError] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitCount, setSubmitCount] = useState<number | null>(null);
  // Initialize from the URL so filtered views are bookmarkable / survive back-nav.
  const [filters, setFilters] = useState<FilterState>(() =>
    readFilters(searchParams),
  );

  const filtersAreDefault =
    filters.category === DEFAULT_FILTERS.category &&
    filters.cookingTime === DEFAULT_FILTERS.cookingTime &&
    filters.sortBy === DEFAULT_FILTERS.sortBy &&
    filters.language === DEFAULT_FILTERS.language &&
    filters.query === DEFAULT_FILTERS.query;

  // Reflect filters into the URL (replace, no scroll jump) so state is preserved
  // across navigation and shareable.
  useEffect(() => {
    const qs = writeParams(filters);
    router.replace(qs ? `/app/hub?${qs}` : "/app/hub", { scroll: false });
  }, [filters, router]);

  // Monotonic request id: a filter change or a newer load invalidates any
  // in-flight fetch so a stale response can't append to (or overwrite) the list.
  const reqRef = useRef(0);

  // Fetch the first page whenever filters change (resets pagination).
  useEffect(() => {
    const myId = ++reqRef.current;
    setLoading(true);
    setError(false);
    setLoadMoreError(false);
    setLoadingMore(false);
    setPage(0);
    fetchRecipes(filters, 0)
      .then((data) => {
        if (reqRef.current !== myId) return;
        setRecipes(data);
        setHasMore(data.length === RECIPES_PAGE_SIZE);
        setLoading(false);
      })
      .catch(() => {
        if (reqRef.current !== myId) return;
        setError(true);
        setLoading(false);
      });
  }, [filters]);

  const loadMore = () => {
    const nextPage = page + 1;
    const myId = ++reqRef.current;
    setLoadingMore(true);
    setLoadMoreError(false);
    fetchRecipes(filters, nextPage)
      .then((data) => {
        if (reqRef.current !== myId) return;
        // Dedupe by id so a re-fetched row can't produce duplicate React keys.
        setRecipes((prev) => {
          const seen = new Set(prev.map((r) => r.id));
          return [...prev, ...data.filter((r) => !seen.has(r.id))];
        });
        setPage(nextPage);
        setHasMore(data.length === RECIPES_PAGE_SIZE);
      })
      .catch(() => {
        if (reqRef.current !== myId) return;
        // Keep the button so the user can retry, instead of implying "the end".
        setLoadMoreError(true);
      })
      .finally(() => {
        if (reqRef.current === myId) setLoadingMore(false);
      });
  };

  return (
    <>
      <Header onSubmitClick={() => setIsModalOpen(true)} />
      <main className="max-w-5xl mx-auto p-4 md:p-6">
        <Filters filters={filters} onFilterChange={setFilters} />

        {submitCount != null && (
          <div
            role="status"
            aria-live="polite"
            className="mt-6 rounded-lg bg-ctp-surface0 text-ctp-subtext1 px-4 py-3 text-sm flex items-center justify-between gap-4"
          >
            <span>
              {submitCount} {submitCount === 1 ? "recipe" : "recipes"} published
              to the hub. Thank you!
            </span>
            <button
              onClick={() => setSubmitCount(null)}
              aria-label="Dismiss"
              className="shrink-0 -m-2 p-2 text-ctp-subtext0 hover:text-ctp-text font-semibold"
            >
              ×
            </button>
          </div>
        )}

        {loading ? (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6"
            aria-live="polite"
            aria-busy="true"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-lg bg-ctp-surface0 animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-ctp-red">
              Something went wrong loading recipes.
            </p>
            <button
              onClick={() => setFilters((f) => ({ ...f }))}
              className="mt-3 bg-ctp-green text-ctp-base font-semibold px-4 py-2 rounded-lg hover:opacity-90"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {recipes.length > 0 ? (
                recipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))
              ) : (
                <div className="text-center col-span-full py-10">
                  <p className="text-ctp-subtext0">
                    No recipes found matching your filters.
                  </p>
                  {!filtersAreDefault && (
                    <button
                      onClick={() => setFilters(DEFAULT_FILTERS)}
                      className="mt-3 bg-ctp-surface0 text-ctp-text font-semibold px-4 py-2 rounded-lg hover:bg-ctp-surface1 focus-visible:outline-2 focus-visible:outline-ctp-blue"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {hasMore && (
              <div className="flex flex-col items-center gap-2 mt-8">
                {loadMoreError && (
                  <p className="text-ctp-red text-sm" aria-live="polite">
                    Couldn’t load more. Please try again.
                  </p>
                )}
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="bg-ctp-surface0 text-ctp-text font-semibold px-6 py-2 rounded-lg hover:bg-ctp-surface1 focus-visible:outline-2 focus-visible:outline-ctp-blue disabled:opacity-60"
                >
                  {loadingMore
                    ? "Loading…"
                    : loadMoreError
                      ? "Retry"
                      : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <SubmitModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(count) => {
          setIsModalOpen(false);
          setSubmitCount(count);
        }}
      />
    </>
  );
}

export default function HomePage() {
  // useSearchParams() requires a Suspense boundary during prerender.
  return (
    <Suspense>
      <HubContent />
    </Suspense>
  );
}
