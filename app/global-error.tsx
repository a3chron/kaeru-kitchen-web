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

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          background: "#1e1e2e",
          color: "#cdd6f4",
        }}
      >
        <h1 style={{ fontSize: "1.875rem", fontWeight: 700, margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ color: "#a6adc8", maxWidth: "32rem", margin: 0 }}>
          The app hit an unexpected error. Please try again.
        </p>
        <button
          onClick={() => reset()}
          style={{
            background: "#a6e3a1",
            color: "#1e1e2e",
            fontWeight: 600,
            padding: "0.5rem 1.25rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
