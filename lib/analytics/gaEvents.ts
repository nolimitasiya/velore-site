export function trackOutboundBrandClick(params: {
  brandName?: string | null;
  productId?: string | null;
  productName?: string | null;
  href?: string | null;
}) {
  if (typeof window === "undefined" || !window.gtag) return;

  window.gtag("event", "outbound_brand_click", {
    brand_name: params.brandName || "unknown",
    product_id: params.productId || "unknown",
    product_name: params.productName || "unknown",
    outbound_url: params.href || "unknown",
    page_path: window.location.pathname,
  });
}