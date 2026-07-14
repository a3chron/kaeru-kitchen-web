import RecipeNotFound from "@/components/recipe-not-found";

export default function NotFound() {
  return (
    <RecipeNotFound
      title="Shared Recipe Not Found"
      message="This recipe could not be found — it may have been removed or never existed."
      linkLabel="← Browse all recipes"
    />
  );
}
