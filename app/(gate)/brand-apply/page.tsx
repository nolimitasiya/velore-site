"use client";

import { useEffect } from "react";
import BrandApplyForm from "@/app/(site)/brands/apply/BrandApplyForm";
import StaggerMount from "./StaggerMount";

export default function BrandApplyGatePage() {
  useEffect(() => {
    const t = setTimeout(() => {
      document.querySelector<HTMLInputElement>("input, textarea, select")?.focus();
    }, 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="min-h-screen w-full bg-white flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-3xl">
        <div className="text-center">
          <h1 className="font-serif text-4xl sm:text-5xl tracking-tight">Veilora Club</h1>
          <p className="mt-3 text-sm text-neutral-600">Brand application</p>
        </div>

        <StaggerMount>
          <div className="mt-10 rounded-2xl border bg-white p-6 sm:p-8">
            <BrandApplyForm />
          </div>
        </StaggerMount>
      </div>
    </main>
  );
}
