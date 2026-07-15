"use client";

import { Smartphone } from "lucide-react";
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

/**
 * "Open in app" affordance for the browser fallback pages.
 *
 * Both open actions navigate to a custom scheme directly inside the click
 * handler (a real user gesture), which mobile browsers require to honour a
 * custom-scheme navigation — the previous timer-driven "try free, then premium
 * 1.2s later" chain fired the premium attempt outside any gesture, so it was
 * silently blocked, and its blur/visibility heuristic misread any window switch
 * as "handled". Explicit per-app buttons plus both store links are unambiguous
 * and don't depend on guessing whether the app opened.
 *
 * On Android we use an `intent://` URL with `browser_fallback_url` so a missing
 * app auto-redirects to that variant's Play Store page instead of erroring;
 * elsewhere we keep the plain custom-scheme navigation.
 */
export default function OpenInApp({ path }: OpenInAppProps) {
  const open =
    (scheme: string, packageName: string, storeUrl: string) => () => {
      const isAndroid =
        typeof navigator !== "undefined" &&
        /Android/i.test(navigator.userAgent);
      window.location.href = isAndroid
        ? androidIntentUrl(scheme, packageName, path, storeUrl)
        : deepLinkTo(scheme, path);
    };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={open(APP_SCHEMES[0], APP_PACKAGE_FREE, PLAY_STORE_URL_FREE)}
          className="flex items-center justify-center gap-2 font-semibold px-4 py-3 rounded-lg bg-ctp-green text-ctp-base transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ctp-blue"
        >
          <Smartphone size={18} />
          Open in app
        </button>
        <button
          type="button"
          onClick={open(
            APP_SCHEMES[1],
            APP_PACKAGE_PREMIUM,
            PLAY_STORE_URL_PREMIUM,
          )}
          className="flex items-center justify-center gap-2 font-semibold px-4 py-3 rounded-lg bg-ctp-surface0 text-ctp-text transition-colors hover:bg-ctp-surface1 focus-visible:outline-2 focus-visible:outline-ctp-blue"
        >
          <Smartphone size={18} />
          Open in Premium
        </button>
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
          <a
            href={PLAY_STORE_URL_PREMIUM}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 font-medium px-4 py-2 rounded-lg bg-ctp-surface0 text-ctp-text text-sm transition-colors hover:bg-ctp-surface1 focus-visible:outline-2 focus-visible:outline-ctp-blue"
          >
            Get Premium on Google Play
          </a>
        </div>
      </div>
    </div>
  );
}
