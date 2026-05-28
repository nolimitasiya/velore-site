"use client";

export default function ProductClickTrackingLink({
  href,
  productId,
  productName,
  brandName,
  children,
  className,
}: {
  href: string;
  productId: string;
  productName: string;
  brandName?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={() => {
        if (typeof window === "undefined" || !window.gtag) return;

        window.gtag("event", "product_click", {
          product_id: productId,
          product_name: productName,
          brand_name: brandName || "unknown",
          href,
          page_path: window.location.pathname,
        });
      }}
    >
      {children}
    </a>
  );
}