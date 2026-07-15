CREATE TABLE "recipe_flags" (
	"recipe_id" uuid NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_flags_recipe_id_ip_hash_pk" PRIMARY KEY("recipe_id","ip_hash")
);
--> statement-breakpoint
CREATE TABLE "recipe_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_reviews_rating_check" CHECK ("recipe_reviews"."rating" between 1 and 5),
	CONSTRAINT "recipe_reviews_comment_len_check" CHECK ("recipe_reviews"."comment" is null or char_length("recipe_reviews"."comment") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "recipes_hub" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recipe_data" jsonb NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"author" text,
	"language" text NOT NULL,
	"total_cooking_time" integer DEFAULT 0 NOT NULL,
	"is_approved" boolean DEFAULT true NOT NULL,
	"flags" integer DEFAULT 0 NOT NULL,
	"average_review" real DEFAULT 0 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "recipes_hub_category_check" CHECK (category in ('breakfast','lunch','dinner','snack','dessert','drink'))
);
--> statement-breakpoint
CREATE TABLE "recipes_shared" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recipe_data" jsonb NOT NULL,
	"title" text NOT NULL,
	"servings" integer,
	"category" text NOT NULL,
	"author" text,
	"total_cooking_time" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "recipes_shared_category_check" CHECK (category in ('breakfast','lunch','dinner','snack','dessert','drink'))
);
--> statement-breakpoint
ALTER TABLE "recipe_flags" ADD CONSTRAINT "recipe_flags_recipe_id_recipes_hub_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes_hub"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_reviews" ADD CONSTRAINT "recipe_reviews_recipe_id_recipes_hub_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes_hub"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_reviews_recipe_ip_uniq" ON "recipe_reviews" USING btree ("recipe_id","ip_hash");--> statement-breakpoint
CREATE INDEX "recipes_hub_approved_created_idx" ON "recipes_hub" USING btree ("is_approved","created_at");--> statement-breakpoint
CREATE INDEX "recipes_hub_category_idx" ON "recipes_hub" USING btree ("category");--> statement-breakpoint
CREATE INDEX "recipes_hub_language_idx" ON "recipes_hub" USING btree ("language");