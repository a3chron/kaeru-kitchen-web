import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// The 6 fixed recipe categories (mirrors lib/validate-recipe.ts).
const categoryCheck = (col: string) =>
  sql.raw(
    `${col} in ('breakfast','lunch','dinner','snack','dessert','drink')`,
  );

/**
 * Published recipes shown in the public hub. Only rows with is_approved = true
 * are readable by anon (enforced by RLS in migration 0001).
 */
export const recipesHub = pgTable(
  "recipes_hub",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    recipeData: jsonb("recipe_data").notNull(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    author: text("author"),
    language: text("language").notNull(),
    totalCookingTime: integer("total_cooking_time").notNull().default(0),
    isApproved: boolean("is_approved").notNull().default(true),
    flags: integer("flags").notNull().default(0),
    averageReview: real("average_review").notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),
  },
  (t) => [
    check("recipes_hub_category_check", categoryCheck("category")),
    index("recipes_hub_approved_created_idx").on(t.isApproved, t.createdAt),
    index("recipes_hub_category_idx").on(t.category),
    index("recipes_hub_language_idx").on(t.language),
  ],
);

/**
 * Temporary shared recipes (link sharing). Publicly readable.
 */
export const recipesShared = pgTable(
  "recipes_shared",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    recipeData: jsonb("recipe_data").notNull(),
    title: text("title").notNull(),
    servings: integer("servings"),
    category: text("category").notNull(),
    author: text("author"),
    totalCookingTime: integer("total_cooking_time").notNull().default(0),
  },
  (t) => [check("recipes_shared_category_check", categoryCheck("category"))],
);

/**
 * Reviews for hub recipes. One review per (recipe, ip_hash) — server-side dedup.
 * Not readable by anon; the aggregate (average_review/review_count) lives on
 * recipes_hub, maintained by a trigger defined in migration 0001.
 */
export const recipeReviews = pgTable(
  "recipe_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipesHub.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    ipHash: text("ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("recipe_reviews_rating_check", sql`${t.rating} between 1 and 5`),
    check(
      "recipe_reviews_comment_len_check",
      sql`${t.comment} is null or char_length(${t.comment}) <= 2000`,
    ),
    uniqueIndex("recipe_reviews_recipe_ip_uniq").on(t.recipeId, t.ipHash),
  ],
);

/**
 * One flag per (recipe, ip_hash) — server-side dedup. The denormalized counter
 * recipes_hub.flags is bumped by the increment_recipe_flag() RPC only when a new
 * row is inserted here.
 */
export const recipeFlags = pgTable(
  "recipe_flags",
  {
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipesHub.id, { onDelete: "cascade" }),
    ipHash: text("ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.recipeId, t.ipHash] })],
);
