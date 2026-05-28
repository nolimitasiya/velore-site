"use client";

import Link from "next/link";

export default function HeroCtaTrackingLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        if (typeof window === "undefined" || !window.gtag) return;

        window.gtag("event", "hero_cta_click", {
          cta_label: label,
          cta_href: href,
          page_path: window.location.pathname,
        });
      }}
    >
      {label}
    </Link>
  );
}