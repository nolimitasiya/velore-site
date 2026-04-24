"use client";

import { useMemo, useState } from "react";
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

function buildAffiliatePreviewUrl(args: {
  sourceUrl: string;
  affiliateBaseUrl?: string | null;
}) {
  const source = String(args.sourceUrl || "").trim();
  if (!source) return "";

  const base = String(args.affiliateBaseUrl || "").trim();
  if (!base) return source;

  // Advanced template format:
  // https://affiliate-network.com/track?url={url}
  if (base.includes("{url}")) {
    return base.replaceAll("{url}", encodeURIComponent(source));
  }

  try {
    const dest = new URL(source);
    const baseUrl = new URL(base);

    // Same-host param format:
    // https://merchant.com/?ref=veilora
    if (baseUrl.host === dest.host) {
      baseUrl.searchParams.forEach((value, key) => {
        if (!dest.searchParams.has(key)) {
          dest.searchParams.set(key, value);
        }
      });
      return dest.toString();
    }

    // Different host without placeholder template:
    // unsupported safely -> fall back to source
    return source;
  } catch {
    return source;
  }
}

function affiliateBadge(status: "PENDING" | "ACTIVE" | "PAUSED") {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em]";

  if (status === "ACTIVE") {
    return {
      cls: `${base} border-green-200 bg-green-50 text-green-800`,
      label: "ACTIVE",
    };
  }

  if (status === "PAUSED") {
    return {
      cls: `${base} border-amber-200 bg-amber-50 text-amber-800`,
      label: "PAUSED",
    };
  }

  return {
    cls: `${base} border-yellow-200 bg-yellow-50 text-yellow-800`,
    label: "PENDING",
  };
}

function rowTint(status: "PENDING" | "ACTIVE" | "PAUSED") {
  if (status === "ACTIVE") return "bg-green-50/[0.35]";
  if (status === "PAUSED") return "bg-amber-50/[0.35]";
  return "bg-yellow-50/[0.35]";
}

export default function BrandRowClient({ b }: { b: BrandRow }) {
  const router = useRouter();
  const status = b.affiliateStatus ?? "PENDING";
  const badge = affiliateBadge(status);

  const [testSourceUrl, setTestSourceUrl] = useState("");

  const affiliateBaseValue = String(b.affiliateBaseUrl ?? "").trim();

  const previewUrl = useMemo(() => {
    return buildAffiliatePreviewUrl({
      sourceUrl: testSourceUrl,
      affiliateBaseUrl: affiliateBaseValue,
    });
  }, [testSourceUrl, affiliateBaseValue]);

  const isPathStyleAffiliateBase = useMemo(() => {
    if (!affiliateBaseValue) return false;

    try {
      const u = new URL(affiliateBaseValue);
      return !u.search && u.pathname !== "/" && !affiliateBaseValue.includes("{url}");
    } catch {
      return false;
    }
  }, [affiliateBaseValue]);

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/admin/brands/${b.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/admin/brands/${b.id}`);
        }
      }}
      className={[
        "cursor-pointer border-t border-black/5 align-top transition-colors",
        rowTint(status),
        "hover:bg-black/[0.025]",
        "focus-within:bg-black/[0.025]",
      ].join(" ")}
    >
      <td className="px-6 py-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="text-[15px] font-semibold tracking-tight text-neutral-950">
            {b.name}
          </div>

          {b.showOnHomepage ? (
            <span className="inline-flex items-center rounded-full border border-[#6b1f2b]/10 bg-[#6b1f2b] px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-white">
              FEATURED
            </span>
          ) : null}

          {b.showOnHomepage && b.homepageOrder ? (
            <span className="inline-flex items-center rounded-full border border-black/10 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-neutral-600">
              Order {b.homepageOrder}
            </span>
          ) : null}
        </div>

        <div className="mt-1 text-xs text-neutral-500">{b.slug}</div>
      </td>

      <td className="px-6 py-5">
        <div className="flex min-h-10 items-center">
          <span className={badge.cls}>{badge.label}</span>
        </div>
      </td>

      <td
        className="px-6 py-5 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {b.showOnHomepage ? (
              <div className="rounded-[20px] border border-black/10 bg-white/80 p-1">
                <HomepageOrderControls brandId={b.id} />
              </div>
            ) : null}

            <AffiliateControls
              brandId={b.id}
              initialStatus={b.affiliateStatus}
              initialProvider={b.affiliateProvider}
              initialBaseUrl={b.affiliateBaseUrl}
            />
          </div>




<div className="ml-auto max-w-[560px] text-left">
  {/* Toggle header */}
  <button
    type="button"
    className="flex w-full items-center justify-between rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm font-medium text-neutral-700 transition hover:bg-black/[0.02]"
    onClick={(e) => {
      const el = e.currentTarget.nextElementSibling;
      el?.classList.toggle("hidden");
    }}
  >
    <span>Affiliate tools</span>
    <span className="text-neutral-400">+</span>
  </button>

  {/* Collapsible content */}
  <div className="mt-3 hidden space-y-4 rounded-[24px] border border-black/10 bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
    
    {/* Supported formats */}
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
        Supported affiliate formats
      </p>

      <div className="mt-2 space-y-2 text-sm text-neutral-700">
        <div>
          <span className="font-medium">1. Brand template: </span>
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[12px]">
            https://merchant.com/?ref=veilora
          </code>
        </div>

        <div>
          <span className="font-medium">2. Advanced: </span>
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[12px]">
            https://affiliate-network.com/track?url={"{url}"}
          </code>
        </div>

        <div>
          <span className="font-medium">3. Best long-term: </span>
          product-level affiliate URLs
        </div>

        <p className="pt-1 text-xs text-neutral-500">
          Avoid path-only links unless confirmed by the brand.
        </p>
      </div>
    </div>

    {/* Test tool */}
    <div className="border-t border-black/10 pt-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
        Test affiliate link
      </p>

      <div className="mt-3 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Sample product URL
          </label>
          <input
            type="url"
            value={testSourceUrl}
            onChange={(e) => setTestSourceUrl(e.target.value)}
            placeholder="https://merchant.com/products/example-product"
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Preview destination
          </label>
          <div className="min-h-[52px] break-all rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
            {testSourceUrl
              ? previewUrl
              : "Enter a sample product URL to preview."}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={testSourceUrl ? previewUrl : "#"}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              if (!testSourceUrl) e.preventDefault();
            }}
            className={[
              "inline-flex h-10 items-center rounded-2xl px-4 text-sm font-medium transition",
              testSourceUrl
                ? "bg-black text-white hover:opacity-90"
                : "cursor-not-allowed bg-neutral-200 text-neutral-500",
            ].join(" ")}
          >
            Open test link
          </a>

          {isPathStyleAffiliateBase && (
            <span className="text-xs text-amber-700">
              This format may not work reliably.
            </span>
          )}
        </div>
      </div>
    </div>
  </div>
</div>
        </div>
      </td>

      <td
        className="px-6 py-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end">
          <ForceResetButton brandId={b.id} />
        </div>
      </td>
    </tr>
  );
}