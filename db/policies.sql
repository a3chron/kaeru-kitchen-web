-- ============================================================================
-- Functions, trigger, and Row-Level-Security for Kaeru's Kitchen Hub.
--
-- This is the AUTHORITATIVE copy of everything that migration 0001 must apply
-- (kept here for auditing in the Supabase dashboard). To turn it into a real
-- Drizzle migration:
--
--   pnpm db:generate                                        # 0000: tables from db/schema.ts
--   pnpm drizzle-kit generate --custom --name=functions_and_rls   # 0001: empty file
--   # paste the contents of THIS file into db/migrations/0001_functions_and_rls.sql
--   pnpm db:migrate
--
-- The `--> statement-breakpoint` markers below are how drizzle-kit splits a
-- custom migration into separate statements (each is sent as its own query,
-- which the extended protocol requires). They are ordinary SQL line comments,
-- so this file also runs as-is via `psql -f db/policies.sql`.
--
-- Ordering matters: tables (0000) must exist before functions/RLS (0001). The
-- sequential migration files guarantee that.
-- ============================================================================

-- --- Trigram search (Supabase installs extensions into the `extensions` schema) ---
create extension if not exists pg_trgm with schema extensions;
--> statement-breakpoint

create index if not exists recipes_hub_title_trgm_idx
  on public.recipes_hub using gin (title extensions.gin_trgm_ops);
--> statement-breakpoint

-- --- Search RPC (read path for GET /api/get-recipes) --------------------------
-- Returns only approved rows. Category/language 'all' means "no filter".
-- Cooking-time buckets are de-overlapped (30 belongs only to the 0-30 bucket).
-- limit_count is clamped to [1, 100] and offset_count floored at 0 inside the
-- function, so callers can't request an unbounded or negative page.
-- Returns only PUBLIC columns (never flags / is_approved) so the search path
-- can't leak internal moderation fields to clients. Changing the return type
-- requires dropping the old function first.
drop function if exists public.fuzzy_search_recipes(text, text, text, text, text, integer, integer);
--> statement-breakpoint
create function public.fuzzy_search_recipes(
  search_text text default '',
  category_filter text default 'all',
  language_filter text default 'all',
  cooking_filter text default 'all',
  sort_by text default 'newest',
  limit_count integer default 30,
  offset_count integer default 0
)
returns table (
  id uuid,
  created_at timestamptz,
  recipe_data jsonb,
  title text,
  category text,
  author text,
  language text,
  total_cooking_time integer,
  average_review real,
  review_count integer
)
language sql
stable
set search_path = ''
as $$
  select r.id, r.created_at, r.recipe_data, r.title, r.category, r.author,
         r.language, r.total_cooking_time, r.average_review, r.review_count
  from public.recipes_hub r
  where r.is_approved = true
    and (category_filter = 'all' or r.category = category_filter)
    and (language_filter = 'all' or r.language = language_filter)
    and (
      cooking_filter = 'all'
      or (cooking_filter = '0-30'  and r.total_cooking_time <= 30)
      or (cooking_filter = '30-60' and r.total_cooking_time > 30 and r.total_cooking_time <= 60)
      or (cooking_filter = '60+'   and r.total_cooking_time > 60)
    )
    and (
      search_text = ''
      or r.title ilike '%' || search_text || '%'
      or extensions.similarity(r.title, search_text) > 0.3
    )
  order by
    (case when search_text <> '' then extensions.similarity(r.title, search_text) else 0 end) desc,
    (case when sort_by = 'reviews' then r.average_review else null end) desc nulls last,
    (case when sort_by = 'reviews' then r.review_count else null end) desc nulls last,
    (case when sort_by = 'oldest' then r.created_at else null end) asc nulls last,
    (case when sort_by <> 'oldest' then r.created_at else null end) desc nulls last,
    r.id desc
  limit least(greatest(coalesce(limit_count, 30), 1), 100)
  offset greatest(coalesce(offset_count, 0), 0);
$$;
--> statement-breakpoint

-- Service-role only: the hub server is the sole caller. anon/PUBLIC execute
-- would let anyone with the (public) anon key scrape the DB via PostgREST,
-- bypassing the app-layer rate limits. Postgres grants EXECUTE to PUBLIC by
-- default on create, hence the explicit revoke.
revoke execute on function public.fuzzy_search_recipes(text, text, text, text, text, integer, integer)
  from public, anon, authenticated;
--> statement-breakpoint
grant execute on function public.fuzzy_search_recipes(text, text, text, text, text, integer, integer)
  to service_role;
--> statement-breakpoint

-- --- Flag increment with per-IP dedup ----------------------------------------
-- Bumps recipes_hub.flags only when a NEW (recipe_id, ip_hash) row is inserted.
create or replace function public.increment_recipe_flag(
  p_recipe_id uuid,
  p_ip_hash text
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_flags integer;
begin
  insert into public.recipe_flags (recipe_id, ip_hash)
  values (p_recipe_id, p_ip_hash)
  on conflict (recipe_id, ip_hash) do nothing;

  if found then
    update public.recipes_hub
      set flags = flags + 1,
          -- Auto-hide once flags reach the threshold. Every read path filters
          -- is_approved = true, so this removes abusive content from public view
          -- until a moderator re-approves it (get-flagged-recipes still lists it).
          -- Threshold kept high (manual weekly moderation handles the rest) so a
          -- handful of flags from a small IP pool can't censor a legit recipe.
          is_approved = case when flags + 1 >= 15 then false else is_approved end
      where id = p_recipe_id
      returning flags into v_flags;
  else
    select flags into v_flags from public.recipes_hub where id = p_recipe_id;
  end if;

  return coalesce(v_flags, 0);
end;
$$;
--> statement-breakpoint

revoke execute on function public.increment_recipe_flag(uuid, text)
  from public, anon, authenticated;
--> statement-breakpoint
grant execute on function public.increment_recipe_flag(uuid, text) to service_role;
--> statement-breakpoint

-- --- Moderator re-approval ----------------------------------------------------
-- Re-approving must also clear the flag history: the existing recipe_flags rows
-- still count toward the auto-hide threshold, so without this a re-approved
-- recipe would be hidden again by the very next single flag.
create or replace function public.approve_recipe(p_recipe_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.recipe_flags where recipe_id = p_recipe_id;

  update public.recipes_hub
    set is_approved = true,
        flags = 0
    where id = p_recipe_id;
end;
$$;
--> statement-breakpoint

revoke execute on function public.approve_recipe(uuid)
  from public, anon, authenticated;
--> statement-breakpoint
grant execute on function public.approve_recipe(uuid) to service_role;
--> statement-breakpoint

-- --- Review aggregate maintenance --------------------------------------------
-- recipes_hub.average_review / review_count are derived from recipe_reviews.
-- Recompute from scratch on any change (robust against out-of-order edits).
create or replace function public.recompute_recipe_review_aggregate()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_recipe_id uuid := coalesce(NEW.recipe_id, OLD.recipe_id);
begin
  update public.recipes_hub h
    set review_count = agg.cnt,
        average_review = coalesce(agg.avg_rating, 0)
    from (
      select count(*)::int as cnt, avg(rating)::real as avg_rating
      from public.recipe_reviews
      where recipe_id = v_recipe_id
    ) agg
    where h.id = v_recipe_id;
  return null;
end;
$$;
--> statement-breakpoint

drop trigger if exists recipe_reviews_aggregate_trg on public.recipe_reviews;
--> statement-breakpoint
create trigger recipe_reviews_aggregate_trg
after insert or update or delete on public.recipe_reviews
for each row execute function public.recompute_recipe_review_aggregate();
--> statement-breakpoint

-- --- Row-Level Security ------------------------------------------------------
-- RLS is enabled on every table with NO policies: anon/authenticated can read
-- and write nothing. All access goes through the service-role key (which
-- bypasses RLS) in server code — no hub code uses the anon key. Anon read
-- policies would let anyone with the public anon key scrape both recipe
-- tables via PostgREST at full speed, bypassing the app-layer rate limits, so
-- don't add any. (The drop statements make this file idempotent against a DB
-- created from an older revision that still had them.)
alter table public.recipes_hub    enable row level security;
--> statement-breakpoint
alter table public.recipes_shared enable row level security;
--> statement-breakpoint
alter table public.recipe_reviews enable row level security;
--> statement-breakpoint
alter table public.recipe_flags   enable row level security;
--> statement-breakpoint

drop policy if exists "anon read approved hub recipes" on public.recipes_hub;
--> statement-breakpoint
drop policy if exists "anon read shared recipes" on public.recipes_shared;
