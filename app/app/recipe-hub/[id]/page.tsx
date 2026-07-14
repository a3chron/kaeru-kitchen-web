import { notFound } from "next/navigation";
import Header from "@/components/header";
import RecipeDetail from "@/components/recipe-detail";
import OpenInApp from "@/components/open-in-app";
import { getRecipe } from "../../recipe-data";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipePage({ params }: PageProps) {
  const { id } = await params;
  const recipe = await getRecipe(id);

  if (!recipe) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="mb-4 p-4 bg-ctp-mantle border border-ctp-surface0 rounded-lg">
          <p className="text-ctp-subtext0 text-sm mb-3">
            Have the app? Open this recipe in Kaeru&apos;s Kitchen.
          </p>
          <OpenInApp path={`app/recipe-hub/${id}`} />
        </div>

        <RecipeDetail recipe={recipe} />
      </main>
    </>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const recipe = await getRecipe(id);

  if (!recipe) {
    return {
      title: "Recipe Not Found",
    };
  }

  const title = `${recipe.title} - Kaeru's Kitchen`;
  const description = `View the recipe for "${recipe.title}" by "${recipe.author ?? "Anonymous"}"`;
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary", title, description },
  };
}
