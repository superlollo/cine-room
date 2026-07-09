import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "CineRoom — decidete insieme che film guardare",
  description:
    "Liste di film condivise, stanze via link ed estrazione a caso: basta scrollare i cataloghi.",
  openGraph: {
    title: "CineRoom — decidete insieme che film guardare",
    description:
      "Liste di film condivise, stanze via link ed estrazione a caso: basta scrollare i cataloghi.",
    siteName: "CineRoom",
    type: "website",
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "CineRoom",
    description: "Decidete insieme che film guardare.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${inter.variable} ${sora.variable}`}>
      <body className="relative min-h-dvh bg-background font-sans text-foreground antialiased">
        {/* Faretto da sala cinema in alto */}
        <div
          aria-hidden
          className="spotlight pointer-events-none fixed inset-0 -z-10"
        />
        {children}
      </body>
    </html>
  );
}
