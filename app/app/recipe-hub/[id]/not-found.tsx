import RecipeNotFound from "@/components/recipe-not-found";

export default function NotFound() {
  return (
    <RecipeNotFound
      title="Recipe Not Found"
      message="The recipe you're looking for doesn't exist."
      linkLabel="← Back to all recipes"
    />
  );
}
