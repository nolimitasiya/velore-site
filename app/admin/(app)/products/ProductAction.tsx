"use client";

export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";

type Props = {
  id: string;
  isActive: boolean;
  publishedAt: string | null;
};

export function ProductActions({ id, isActive, publishedAt }: Props) {
  const router = useRouter();

  async function toggleActive() {
    await fetch(`/api/admin/products/${id}/active`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": process.env.NEXT_PUBLIC_ADMIN_IMPORT_TOKEN!,
      },
      body: JSON.stringify({ isActive: !isActive }),
    });

    router.refresh();
  }

  async function togglePublish() {
    await fetch(`/api/admin/products/${id}/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": process.env.NEXT_PUBLIC_ADMIN_IMPORT_TOKEN!,
      },
      body: JSON.stringify({ published: !publishedAt }),
    });

    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={toggleActive}
        className={`inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-sm font-medium transition ${
          isActive
            ? "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        }`}
      >
        {isActive ? "Active" : "Inactive"}
      </button>

      <button
        onClick={togglePublish}
        className={`inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-sm font-medium transition ${
          publishedAt
            ? "bg-black text-white hover:bg-black/90"
            : "border border-black/10 bg-white text-neutral-700 hover:bg-black/[0.03]"
        }`}
      >
        {publishedAt ? "Published" : "Draft"}
      </button>
    </div>
  );
}