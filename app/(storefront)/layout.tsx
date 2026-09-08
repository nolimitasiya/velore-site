import SiteShell from "@/components/SiteShell";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteShell>{children}</SiteShell>;
}