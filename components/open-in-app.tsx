"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Smartphone } from "lucide-react";
import { APP_SCHEMES, PLAY_STORE_URL, deepLinkTo } from "@/lib/constants";

// How long a scheme attempt waits before concluding no app handled it.
const ATTEMPT_WINDOW_MS = 1200;

interface OpenInAppProps {
  // Path inside the app, e.g. `app/shared/<id>` — tried against each app
  // scheme (free, then premium) in order.
  path: string;
}

/**
 * "Open in app" affordance for the browser fallback pages. On click it tries
 * each app scheme in turn; if the app grabs the navigation the page is
 * hidden/blurred, which cancels the chain. If no scheme is handled, it points
 * at the Play Store link instead of navigating away — an auto-redirect would
 * hijack desktop users (and anyone who already navigated on) to the store.
 */
export default function OpenInApp({ path }: OpenInAppProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeListenersRef = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<"idle" | "trying" | "failed">("idle");

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    removeListenersRef.current?.();
    removeListenersRef.current = null;
  }, []);

  // A pending attempt must not survive unmount: its timer would fire after
  // the user navigated elsewhere in the SPA.
  useEffect(() => cancel, [cancel]);

  const tryScheme = (index: number) => {
    if (index >= APP_SCHEMES.length) {
      setStatus("failed");
      return;
    }

    // When the OS hands off to the app, this page is hidden/blurred — that's
    // the signal that the link was handled and the chain should stop.
    const handled = () => {
      cancel();
      setStatus("idle");
    };
    const onVisibility = () => {
      if (document.hidden) handled();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", handled);
    window.addEventListener("pagehide", handled);
    removeListenersRef.current = () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", handled);
      window.removeEventListener("pagehide", handled);
    };

    timerRef.current = setTimeout(() => {
      cancel();
      tryScheme(index + 1);
    }, ATTEMPT_WINDOW_MS);

    window.location.href = deepLinkTo(APP_SCHEMES[index], path);
  };

  const handleOpen = () => {
    // Discard any previous pending attempt (double-click) before starting.
    cancel();
    setStatus("trying");
    tryScheme(0);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={handleOpen}
          disabled={status === "trying"}
          className="flex items-center justify-center gap-2 font-semibold px-4 py-3 rounded-lg bg-ctp-green text-ctp-base transition-opacity hover:opacity-90 disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-ctp-blue"
        >
          <Smartphone size={18} />
          {status === "trying" ? "Opening…" : "Open in app"}
        </button>
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 font-semibold px-4 py-3 rounded-lg bg-ctp-surface0 text-ctp-text transition-colors hover:bg-ctp-surface1 focus-visible:outline-2 focus-visible:outline-ctp-blue"
        >
          Get it on Google Play
        </a>
      </div>
      {status === "failed" && (
        <p role="alert" className="text-ctp-subtext0 text-sm">
          Couldn&apos;t open the app — it may not be installed. You can get it
          on Google Play above.
        </p>
      )}
    </div>
  );
}
