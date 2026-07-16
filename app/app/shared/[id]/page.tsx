import { notFound } from "next/navigation";
import Header from "@/components/header";
import RecipeDetail from "@/components/recipe-detail";
import OpenInApp from "@/components/open-in-app";
import { getSharedRecipe } from "../../recipe-data";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SharedRecipePage({ params }: PageProps) {
  const { id } = await params;
  const recipe_data = await getSharedRecipe(id);

  if (!recipe_data) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="mb-4 p-4 bg-ctp-surface0 border border-ctp-green rounded-lg">
          <p className="text-ctp-text text-sm">
            <span className="font-semibold text-ctp-green">Shared Recipe:</span>{" "}
            This recipe was shared directly with you.
          </p>
        </div>

        <div className="mb-4 p-4 bg-ctp-mantle border border-ctp-surface0 rounded-lg">
          <p className="text-ctp-subtext0 text-sm mb-3">
            Have the app? Open this recipe in Kaeru&apos;s Kitchen.
          </p>
          <OpenInApp path={`app/shared/${id}`} />
        </div>

        <RecipeDetail recipe={recipe_data} shared />
      </main>
    </>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const recipe_data = await getSharedRecipe(id);

  if (!recipe_data) {
    return {
      title: "Shared Recipe Not Found",
    };
  }

  const title = `${recipe_data.title} - Shared Recipe`;
  const description = `${recipe_data.author ?? "Someone"} shared: ${recipe_data.title}`;
  return {
    title,
    description,
    // Person-to-person shares aren't meant to be discoverable via search
    // engines — only the public hub pages should be indexed.
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}
