"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Smartphone } from "lucide-react";
import {
  APP_PACKAGE_FREE,
  APP_PACKAGE_PREMIUM,
  APP_SCHEMES,
  PLAY_STORE_URL_FREE,
  PLAY_STORE_URL_PREMIUM,
  androidIntentUrl,
  deepLinkTo,
} from "@/lib/constants";

interface OpenInAppProps {
  // Path inside the app, e.g. `app/shared/<id>`.
  path: string;
}

type Variant = "free" | "premium";

const VARIANTS: Record<
  Variant,
  { label: string; scheme: string; packageName: string; storeUrl: string }
> = {
  free: {
    label: "Open in app",
    scheme: APP_SCHEMES[0],
    packageName: APP_PACKAGE_FREE,
    storeUrl: PLAY_STORE_URL_FREE,
  },
  premium: {
    label: "Open in Premium",
    scheme: APP_SCHEMES[1],
    packageName: APP_PACKAGE_PREMIUM,
    storeUrl: PLAY_STORE_URL_PREMIUM,
  },
};

// Remembered across visits so premium testers only have to switch once.
const VARIANT_STORAGE_KEY = "kaeru-open-in-app-variant";

/**
 * "Open in app" affordance for the browser fallback pages.
 *
 * A GitHub-style split button: the main segment opens the selected app, the
 * chevron segment reveals a menu to switch between free and premium. Premium
 * is a closed-testing build with a handful of users, so it stays tucked away
 * in the menu (and gets no public install link) while remaining one tap away
 * for those testers.
 *
 * The open action navigates to a custom scheme directly inside the click
 * handler (a real user gesture), which mobile browsers require to honour a
 * custom-scheme navigation.
 *
 * On Android we use an `intent://` URL with `browser_fallback_url` so a missing
 * app auto-redirects to the Play Store page instead of erroring; elsewhere we
 * keep the plain custom-scheme navigation.
 */
export default function OpenInApp({ path }: OpenInAppProps) {
  const [variant, setVariant] = useState<Variant>("free");
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Read the stored choice after mount to avoid a hydration mismatch.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(VARIANT_STORAGE_KEY) === "premium") {
        setVariant("premium");
      }
    } catch {
      // Storage unavailable (private mode etc.) — keep the free default.
    }
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const openApp = () => {
    const { scheme, packageName, storeUrl } = VARIANTS[variant];
    const isAndroid =
      typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
    window.location.href = isAndroid
      ? androidIntentUrl(scheme, packageName, path, storeUrl)
      : deepLinkTo(scheme, path);
  };

  const selectVariant = (next: Variant) => {
    setVariant(next);
    setMenuOpen(false);
    try {
      window.localStorage.setItem(VARIANT_STORAGE_KEY, next);
    } catch {
      // Best effort — the selection still applies for this page view.
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div ref={containerRef} className="relative self-start">
        <div className="flex">
          <button
            type="button"
            onClick={openApp}
            className="flex items-center justify-center gap-2 font-semibold px-4 py-3 rounded-l-lg bg-ctp-green text-ctp-base transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ctp-blue"
          >
            <Smartphone size={18} />
            {VARIANTS[variant].label}
          </button>
          <button
            type="button"
            aria-label="Choose which app to open"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center justify-center px-2 rounded-r-lg border-l border-ctp-base/30 bg-ctp-green text-ctp-base transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ctp-blue"
          >
            <ChevronDown size={18} />
          </button>
        </div>

        {menuOpen && (
          <div
            role="menu"
            className="absolute left-0 top-full z-10 mt-1 w-56 overflow-hidden rounded-lg border border-ctp-surface1 bg-ctp-mantle shadow-lg"
          >
            {(Object.keys(VARIANTS) as Variant[]).map((key) => (
              <button
                key={key}
                type="button"
                role="menuitemradio"
                aria-checked={variant === key}
                onClick={() => selectVariant(key)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ctp-text transition-colors hover:bg-ctp-surface0"
              >
                <Check
                  size={16}
                  className={variant === key ? "opacity-100" : "opacity-0"}
                />
                {VARIANTS[key].label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-ctp-subtext0 text-sm">
          Don&apos;t have the app yet?
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href={PLAY_STORE_URL_FREE}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 font-medium px-4 py-2 rounded-lg bg-ctp-surface0 text-ctp-text text-sm transition-colors hover:bg-ctp-surface1 focus-visible:outline-2 focus-visible:outline-ctp-blue"
          >
            Get it on Google Play
          </a>
        </div>
      </div>
    </div>
  );
}
