import Link from "next/link";

interface RecipeNotFoundProps {
  title: string;
  message: string;
  linkLabel: string;
  linkHref?: string;
}

/**
 * Presentational "recipe not found" screen shared by the hub and shared-recipe
 * not-found pages. Each page passes its own copy (title / message / link label).
 */
export default function RecipeNotFound({
  title,
  message,
  linkLabel,
  linkHref = "/app/hub",
}: RecipeNotFoundProps) {
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 text-center">
      <h1 className="text-3xl font-bold text-ctp-text mb-4">{title}</h1>
      <p className="text-ctp-subtext0 mb-6">{message}</p>
      <Link href={linkHref} className="text-ctp-blue hover:text-ctp-sapphire">
        {linkLabel}
      </Link>
    </div>
  );
}
