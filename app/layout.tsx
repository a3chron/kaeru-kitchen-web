import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Mono({
  weight: ["200", "300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kaeru-kitchen-hub.vercel.app"),
  title: "Kaeru's Kitchen Hub",
  description: "Browse and share Kaeru's Kitchen recipes",
  openGraph: {
    title: "Kaeru's Kitchen Hub",
    description: "Browse and share Kaeru's Kitchen recipes",
    type: "website",
  },
  twitter: { card: "summary" },
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
