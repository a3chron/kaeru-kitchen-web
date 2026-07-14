import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useModalA11y } from "@/lib/use-modal-a11y";

interface FlagModalProps {
  isOpen: boolean;
  recipeTitle: string;
  onSubmit: () => void;
  onClose: () => void;
  loading?: boolean;
}

export default function FlagModal({
  isOpen,
  recipeTitle,
  onSubmit,
  onClose,
  loading = false,
}: FlagModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape while open — but not mid-submit (the request keeps running
  // and its result would be lost).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, loading]);

  // Focus management, focus trap, focus restore, body-scroll lock.
  useModalA11y(isOpen, dialogRef);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ctp-overlay2/20 backdrop-blur-2xl"
      onClick={() => {
        if (!loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="flag-modal-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative bg-ctp-mantle w-full max-w-lg p-6 rounded-xl shadow-2xl border border-ctp-surface0 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          disabled={loading}
          aria-label="Close dialog"
          className="absolute top-2 right-2 p-2 text-ctp-subtext0 hover:text-ctp-text disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X size={24} />
        </button>

        <h2
          id="flag-modal-title"
          className="text-2xl font-bold text-ctp-text mb-2"
        >
          Flag Recipe
        </h2>
        <p className="text-ctp-subtext0 mb-6 text-sm">{recipeTitle}</p>

        <div>
          <p>Are you sure you want to flag &quot;{recipeTitle}&quot;?</p>
          <div className="flex gap-3 mt-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-ctp-surface0 text-ctp-text font-semibold px-4 py-3 rounded-lg hover:bg-ctp-surface1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit()}
              disabled={loading}
              className="flex-1 bg-ctp-red text-ctp-base font-semibold px-4 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Flagging…" : "Flag Recipe"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
