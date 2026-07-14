import Header from "@/components/header";
import RecipeNotFound from "@/components/recipe-not-found";

// Root 404 for arbitrary bad URLs — without this, Next.js serves its default
// unstyled black-on-white page, a jarring theme break.
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="py-12">
        <RecipeNotFound
          title="Page Not Found"
          message="The page you're looking for doesn't exist."
          linkLabel="← Back to the hub"
        />
      </main>
    </>
  );
}
