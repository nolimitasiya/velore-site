"use client";

import { useRouter } from "next/navigation";
import AffiliateControls from "./AffiliateControls";
import ForceResetButton from "./ForceResetButton";
import HomepageOrderControls from "./HomepageOrderControls";

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  affiliateStatus: "PENDING" | "ACTIVE" | "PAUSED";
  affiliateProvider: string | null;
  affiliateBaseUrl: string | null;
  showOnHomepage: boolean;
  homepageOrder: number | null;
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
      <td className="px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-medium text-[15px]">{b.name}</div>

          {b.showOnHomepage ? (
            <span className="inline-flex items-center rounded-full bg-[#6b1f2b] px-2.5 py-1 text-[11px] font-medium tracking-wide text-white">
              Featured
            </span>
          ) : null}

          {b.showOnHomepage && b.homepageOrder ? (
            <span className="inline-flex items-center rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-1 text-[11px] text-black/70">
              Order {b.homepageOrder}
            </span>
          ) : null}
        </div>

        <div className="text-xs text-black/50">{b.slug}</div>
      </td>

      <td className="px-4 py-4">
        <span className={badge.cls}>{badge.label}</span>
      </td>

      <td
        className="px-4 py-4 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-2">
          {b.showOnHomepage ? (
            <HomepageOrderControls brandId={b.id} />
          ) : null}

          <AffiliateControls
            brandId={b.id}
            initialStatus={b.affiliateStatus}
            initialProvider={b.affiliateProvider}
            initialBaseUrl={b.affiliateBaseUrl}
          />
        </div>
      </td>

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