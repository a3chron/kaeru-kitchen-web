"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Catches errors thrown in the root layout itself. It replaces the whole
// document, so it must render its own <html>/<body>. Styles are inlined
// because the Catppuccin theme tokens (set on <body> via globals.css) may not
// be available when the layout failed to render.
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Colors come from a prefers-color-scheme <style> block (Catppuccin Latte /
  // Mocha) rather than hardcoded dark values, so light-theme users don't get a
  // sudden dark page. Inlined because the app's theme tokens may be unavailable
  // when the root layout itself failed.
  const css = `
    .ge-root {
      margin: 0; min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 1rem; padding: 1.5rem;
      text-align: center;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      background: #eff1f5; color: #4c4f69;
    }
    .ge-sub { color: #6c6f85; max-width: 32rem; margin: 0; }
    .ge-btn {
      background: #40a02b; color: #eff1f5; font-weight: 600;
      padding: 0.5rem 1.25rem; border-radius: 0.5rem; border: none; cursor: pointer;
    }
    @media (prefers-color-scheme: dark) {
      .ge-root { background: #1e1e2e; color: #cdd6f4; }
      .ge-sub { color: #a6adc8; }
      .ge-btn { background: #a6e3a1; color: #1e1e2e; }
    }
  `;

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="ge-root">
          <h1 style={{ fontSize: "1.875rem", fontWeight: 700, margin: 0 }}>
            Something went wrong
          </h1>
          <p className="ge-sub">
            The app hit an unexpected error. Please try again.
          </p>
          <button className="ge-btn" onClick={() => reset()}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
