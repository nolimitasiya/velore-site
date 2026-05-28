"use client";

// C:\Users\Asiya\projects\dalra\app\b\[brandSlug]\p\[productSlug]\Accordion.tsx

import { useState } from "react";

export default function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left"
      >
        <span className="text-sm font-medium text-black/80">{title}</span>
        <span
          className={[
            "text-black/40 transition-transform duration-200 text-lg leading-none",
            open ? "rotate-180" : "",
          ].join(" ")}
        >
          ‹
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
