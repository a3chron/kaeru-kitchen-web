"use client";

import {
  CategoryValue,
  COOKING_TIME_OPTIONS,
  CookingTimeValue,
  RECIPE_CATEGORIES,
  SORT_OPTIONS,
  SortValue,
} from "@/lib/constants";
import { DEFAULT_LANGUAGES, loadLanguages } from "@/lib/languages";
import { useEffect, useState } from "react";

// Derived from the single source of truth in lib/constants.ts so the options
// offered here can never drift from what the server accepts.
const categories: { value: CategoryValue; label: string }[] = [
  { value: "all", label: "All" },
  ...RECIPE_CATEGORIES.map((c) => ({
    value: c as CategoryValue,
    label: c.charAt(0).toUpperCase() + c.slice(1),
  })),
];

const cookingTimes = COOKING_TIME_OPTIONS;
const sortOptions = SORT_OPTIONS;

const languageDefaultOptions: { value: string; label: string }[] = [
  { value: "all", label: "All Languages" },
  ...DEFAULT_LANGUAGES.map((l) => ({ value: l.code, label: l.label })),
];

export interface FilterState {
  category: CategoryValue;
  cookingTime: CookingTimeValue;
  sortBy: SortValue;
  language: string;
}

interface FilterProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
}

export default function Filters({ filters, onFilterChange }: FilterProps) {
  // Update a single filter value; the generic keeps key and value correlated so
  // the compiler rejects e.g. a sortBy value assigned to category.
  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const [languages, setLanguages] = useState(languageDefaultOptions);

  useEffect(() => {
    loadLanguages()
      .then((list) =>
        setLanguages([
          { value: "all", label: "All Languages" },
          ...list.map((l) => ({ value: l.code, label: l.label })),
        ]),
      )
      .catch((err) => console.error("Failed to load languages:", err));
  }, []);

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Language Filter */}
      <div className="flex-1">
        <label
          htmlFor="language"
          className="block text-sm font-medium text-ctp-subtext1 mb-1"
        >
          Language
        </label>
        <select
          id="language"
          value={filters.language}
          onChange={(e) => updateFilter("language", e.target.value)}
          className="w-full bg-ctp-surface0 border border-ctp-surface1 rounded-lg p-2 text-ctp-text focus:outline-none focus:ring-2 focus:ring-ctp-green focus:border-ctp-green"
        >
          {languages.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Category Filter */}
      <div className="flex-1">
        <label
          htmlFor="category"
          className="block text-sm font-medium text-ctp-subtext1 mb-1"
        >
          Category
        </label>
        <select
          id="category"
          value={filters.category}
          onChange={(e) =>
            updateFilter("category", e.target.value as FilterState["category"])
          }
          className="w-full bg-ctp-surface0 border border-ctp-surface1 rounded-lg p-2 text-ctp-text focus:outline-none focus:ring-2 focus:ring-ctp-green focus:border-ctp-green"
        >
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Cooking Time Filter */}
      <div className="flex-1">
        <label
          htmlFor="cookingTime"
          className="block text-sm font-medium text-ctp-subtext1 mb-1"
        >
          Cooking Time
        </label>
        <select
          id="cookingTime"
          value={filters.cookingTime}
          onChange={(e) =>
            updateFilter(
              "cookingTime",
              e.target.value as FilterState["cookingTime"],
            )
          }
          className="w-full bg-ctp-surface0 border border-ctp-surface1 rounded-lg p-2 text-ctp-text focus:outline-none focus:ring-2 focus:ring-ctp-green focus:border-ctp-green"
        >
          {cookingTimes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Sort By Filter */}
      <div className="flex-1">
        <label
          htmlFor="sortBy"
          className="block text-sm font-medium text-ctp-subtext1 mb-1"
        >
          Sort By
        </label>
        <select
          id="sortBy"
          value={filters.sortBy}
          onChange={(e) =>
            updateFilter("sortBy", e.target.value as FilterState["sortBy"])
          }
          className="w-full bg-ctp-surface0 border border-ctp-surface1 rounded-lg p-2 text-ctp-text focus:outline-none focus:ring-2 focus:ring-ctp-green focus:border-ctp-green"
        >
          {sortOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
