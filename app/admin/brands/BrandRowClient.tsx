"use client";

import { useRouter } from "next/navigation";
import AffiliateControls from "./AffiliateControls";
import ForceResetButton from "./ForceResetButton";

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  affiliateStatus: "PENDING" | "ACTIVE" | "PAUSED";
  affiliateProvider: string | null;
  affiliateBaseUrl: string | null;
};

function affiliateBadge(status: "PENDING" | "ACTIVE" | "PAUSED") {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium";

  if (status === "ACTIVE") {
    return {
      cls: `${base} bg-green-50 text-green-800 border-green-200`,
      label: "ACTIVE",
    };
  }

  if (status === "PAUSED") {
    return {
      cls: `${base} bg-amber-50 text-amber-800 border-amber-200`,
      label: "PAUSED",
    };
  }

  return {
    cls: `${base} bg-yellow-50 text-yellow-800 border-yellow-200`,
    label: "PENDING",
  };
}

function rowTint(status: "PENDING" | "ACTIVE" | "PAUSED") {
  if (status === "ACTIVE") return "bg-green-50/20";
  if (status === "PAUSED") return "bg-amber-50/20";
  return "bg-yellow-50/20";
}

export default function BrandRowClient({ b }: { b: BrandRow }) {
  const router = useRouter();
  const status = b.affiliateStatus ?? "PENDING";
  const badge = affiliateBadge(status);

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/admin/brands/${b.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          router.push(`/admin/brands/${b.id}`);
        }
      }}
      className={`border-t border-black/10 transition-colors cursor-pointer ${rowTint(
        status
      )} hover:bg-black/[0.03]`}
    >
      {/* Brand */}
      <td className="px-4 py-4">
        <div className="font-medium text-[15px]">{b.name}</div>
        <div className="text-xs text-black/50">{b.slug}</div>
      </td>

      {/* Status */}
      <td className="px-4 py-4">
        <span className={badge.cls}>{badge.label}</span>
      </td>

      {/* Affiliate Controls */}
      <td
        className="px-4 py-4 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <AffiliateControls
          brandId={b.id}
          initialStatus={b.affiliateStatus}
          initialProvider={b.affiliateProvider}
          initialBaseUrl={b.affiliateBaseUrl}
        />
      </td>

      {/* Actions */}
      <td
        className="px-4 py-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end gap-2">
          <ForceResetButton brandId={b.id} />
        </div>
      </td>
    </tr>
  );
}