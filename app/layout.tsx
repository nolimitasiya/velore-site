import "./globals.css";

export const metadata = {
  title: "Veilora Club",
  description: "Launching soon",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
