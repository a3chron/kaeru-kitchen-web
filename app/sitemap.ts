import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { supabaseServer } from "@/lib/supabase-server";

// Refresh hourly so newly-approved recipes get listed without a redeploy.
export const revalidate = 3600;

/**
 * Sitemap for crawlers. Lists the static pages plus every APPROVED hub recipe
 * (public, browsable). Shared recipes are per-share private links, so they are
 * intentionally excluded. `created_at` is used as lastModified — there is no
 * updated_at column. If the DB is unreachable (e.g. env-less build), we still
 * emit the static routes rather than failing the build.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/app/hub`, changeFrequency: "daily", priority: 0.9 },
  ];

  try {
    const { data, error } = await supabaseServer
      .from("recipes_hub")
      .select("id, created_at")
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (!error && data) {
      for (const row of data as { id: string; created_at: string | null }[]) {
        routes.push({
          url: `${SITE_URL}/app/recipe-hub/${row.id}`,
          lastModified: row.created_at ? new Date(row.created_at) : undefined,
          changeFrequency: "monthly",
          priority: 0.7,
        });
      }
    }
  } catch (err) {
    console.error("sitemap: failed to load hub recipes", err);
  }

  return routes;
}
