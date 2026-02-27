import type { ReactNode } from "react";

export default function AdminAuthLayout({ children }: { children: ReactNode }) {
  // Auth pages render their own AuthShell inside the page components (as you already do)
  return <>{children}</>;
}