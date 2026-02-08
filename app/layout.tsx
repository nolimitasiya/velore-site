import "./globals.css";
import { Abril_Fatface } from "next/font/google";

const abril = Abril_Fatface({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-abril",
});

export const metadata = {
  title: "Veilora Club",
  description: "Launching soon",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={abril.variable}>
        {children}
      </body>
    </html>
  );
}
