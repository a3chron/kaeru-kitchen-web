import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/constants";
import "./globals.css";

const plex = IBM_Plex_Mono({
  weight: ["200", "300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Kaeru's Kitchen Hub",
  description: "Browse and share Kaeru's Kitchen recipes",
  openGraph: {
    title: "Kaeru's Kitchen Hub",
    description: "Browse and share Kaeru's Kitchen recipes",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plex.className} bg-ctp-base text-ctp-text transition-colors duration-300`}
      >
        {children}
      </body>
    </html>
  );
}
