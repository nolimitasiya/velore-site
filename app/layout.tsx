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

const SITE_URL = "https://www.veiloraclub.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: "Veilora Club | Home of Global Modest Fashion",

  description:
    "Discover curated modest fashion brands from around the world, all in one destination.",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title: "Veilora Club | Home of Global Modest Fashion",
    description:
      "Discover curated modest fashion brands from around the world, all in one destination.",
    url: SITE_URL,
    siteName: "Veilora Club",
    type: "website",
  },

  twitter: {
    card: "summary",
    title: "Veilora Club | Home of Global Modest Fashion",
    description:
      "Discover curated modest fashion brands from around the world, all in one destination.",
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