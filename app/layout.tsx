import type { Metadata } from "next";
import "./globals.css";
import {
  Abril_Fatface,
  Inter,
  Great_Vibes,
  Cormorant_Garamond,
} from "next/font/google";

const heading = Abril_Fatface({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const script = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-script",
  display: "swap",
});

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-display",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http")
    ? process.env.NEXT_PUBLIC_SITE_URL
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Veilora Club | Home of Global Modest Fashion",
  description:
    "Discover curated modest fashion brands from around the world, all in one destination.",
  openGraph: {
    title: "Veilora Club | Home of Global Modest Fashion",
    description:
      "Discover curated modest fashion brands from around the world, all in one destination.",
    url: SITE_URL,
    siteName: "Veilora Club",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${heading.variable} ${body.variable} ${display.variable} ${script.variable}`}
    >
      <body className="min-h-screen w-full bg-white font-body text-black">
        {children}
      </body>
    </html>
  );
}