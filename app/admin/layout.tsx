import type { ReactNode } from "react";

// Root admin layout: keep it minimal so route-group layouts control chrome.
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}