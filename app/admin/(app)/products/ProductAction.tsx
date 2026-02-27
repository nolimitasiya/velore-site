"use client";

export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";

type Props = {
  id: string;
  isActive: boolean;
  publishedAt: string | null; // keep string so it's safe to pass from server
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
    <div className="flex gap-2">
      <button
        onClick={toggleActive}
        className={`px-3 py-1 text-sm rounded ${
          isActive ? "bg-green-600 text-white" : "bg-gray-200"
        }`}
      >
        {isActive ? "Active" : "Inactive"}
      </button>

      <button
        onClick={togglePublish}
        className={`px-3 py-1 text-sm rounded ${
          publishedAt ? "bg-black text-white" : "bg-gray-200"
        }`}
      >
        {publishedAt ? "Published" : "Draft"}
      </button>
    </div>
  );
}
