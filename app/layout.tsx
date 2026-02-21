import "./globals.css";
import { Playfair_Display, Inter } from "next/font/google";

const heading = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http")
    ? process.env.NEXT_PUBLIC_SITE_URL
    : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Veilora Club",
  description: "Where global brands and international style meet",
  openGraph: {
    title: "Veilora Club",
    description: "Where global brands and international style meet",
    url: SITE_URL,
    siteName: "Veilora Club",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body className="min-h-screen w-full bg-white font-body text-black">
        {children}
      </body>
    </html>
  );
}
