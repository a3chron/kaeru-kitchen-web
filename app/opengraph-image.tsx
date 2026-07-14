import { ImageResponse } from "next/og";
import { OgCard } from "@/lib/og-card";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Kaeru's Kitchen Hub";

// Default branded card for the site (and any page without its own image).
export default function Image() {
  return new ImageResponse(
    <OgCard title="Kaeru's Kitchen Hub" subtitle="Browse and share recipes" />,
    { ...size },
  );
}
