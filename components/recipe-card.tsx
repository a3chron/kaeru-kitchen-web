import { HubRecipeRow } from "@/types/recipe";
import { getTotalCookingTime } from "@/lib/utils";
import { Clock, Star, Users } from "lucide-react";
import Link from "next/link";

interface RecipeCardProps {
  recipe: HubRecipeRow;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const {
    id,
    recipe_data,
    title,
    category,
    total_cooking_time,
    average_review,
    review_count,
  } = recipe;

  const totalCookingTime =
    total_cooking_time ?? getTotalCookingTime(recipe_data);

  return (
    <Link
      href={`/app/recipe-hub/${id}`}
      className="bg-ctp-mantle border border-ctp-surface0 rounded-xl p-5 text-left transition-all hover:shadow-lg hover:-translate-y-1 hover:border-ctp-green"
    >
      <h3
        className="text-xl font-bold text-ctp-green line-clamp-2"
        title={title}
      >
        {title}
      </h3>
      <p className="text-ctp-subtext0 capitalize mt-1 mb-3">{category}</p>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-ctp-subtext1">
        {totalCookingTime !== 0 && (
          <span className="flex items-center gap-1.5">
            <Clock size={16} />
            {totalCookingTime} min
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Users size={16} />
          {recipe_data.servings || "N/A"} servings
        </span>
        {average_review != null && average_review !== 0 && (
          <span className="flex items-center gap-1.5">
            <Star size={16} className="text-ctp-yellow" />
            {average_review.toFixed(1)} ({review_count})
          </span>
        )}
      </div>
    </Link>
  );
}
