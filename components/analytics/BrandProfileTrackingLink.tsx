"use client";

import Link from "next/link";

export default function BrandProfileTrackingLink({
  href,
  brandName,
  brandId,
  children,
  className,
}: {
  href: string;
  brandName: string;
  brandId?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        if (typeof window === "undefined" || !window.gtag) return;

        window.gtag("event", "brand_profile_click", {
          brand_name: brandName,
          brand_id: brandId || "unknown",
          href,
          page_path: window.location.pathname,
        });
      }}
    >
      {children}
    </Link>
  );
}