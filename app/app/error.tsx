"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  // Surface the error to the console/monitoring; the digest links it to the
  // server-side log entry.
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 text-center">
      <h1 className="text-3xl font-bold text-ctp-text mb-4">
        Something went wrong
      </h1>
      <p className="text-ctp-subtext0 mb-6">
        We couldn&apos;t load this recipe right now. This is usually temporary —
        please try again in a moment.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="bg-ctp-green text-ctp-base font-semibold px-5 py-2 rounded-lg hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ctp-blue"
        >
          Try again
        </button>
        <Link
          href="/app/hub"
          className="text-ctp-blue hover:text-ctp-sapphire font-semibold focus-visible:outline-2 focus-visible:outline-ctp-blue rounded"
        >
          ← Browse all recipes
        </Link>
      </div>
    </div>
  );
}
