import { RefObject, useEffect } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Accessibility plumbing shared by the hub's modal dialogs:
 * - moves focus into the dialog on open (first focusable element, or the
 *   dialog container as a fallback — give it `tabIndex={-1}`)
 * - traps Tab / Shift+Tab focus within the dialog
 * - restores focus to whatever was focused before opening, on close
 * - locks body scroll while open
 *
 * `dialogRef` should point at the dialog content element (the panel), not the
 * backdrop.
 */
export function useModalA11y(
  isOpen: boolean,
  dialogRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null);

    // Move focus into the dialog.
    const initial = getFocusable();
    (initial[0] ?? dialog).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialog.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener("keydown", onKeyDown);

    // Lock body scroll while the dialog is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      dialog.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      // Restore focus to the opener so keyboard users aren't dropped at the
      // top of the page.
      previouslyFocused?.focus?.();
    };
  }, [isOpen, dialogRef]);
}
