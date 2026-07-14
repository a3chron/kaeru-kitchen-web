import { Plus } from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  // Renders the "Submit Recipe" button when provided (the hub grid). Detail /
  // deep-link pages omit it and just get the branding + home link.
  onSubmitClick?: () => void;
}

export default function Header({ onSubmitClick }: HeaderProps) {
  return (
    <header className="bg-ctp-mantle border-b border-ctp-surface0 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto p-4 flex flex-wrap justify-between items-center gap-3">
        <Link href="/app/hub">
          <h1 className="text-2xl font-bold text-ctp-green">
            Kaeru&apos;s Kitchen Hub
          </h1>
        </Link>
        {onSubmitClick && (
          <button
            onClick={onSubmitClick}
            className="flex items-center gap-2 bg-ctp-green text-ctp-base font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={18} />
            Submit Recipe
          </button>
        )}
      </div>
    </header>
  );
}
