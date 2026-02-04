import { ReactNode } from "react";
import { BrandHeader } from "@/components/brand/BrandHeader";

export default function BrandLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <BrandHeader />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
