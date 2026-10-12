export function getBrandOnboardingUrl(token: string): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configuredUrl && process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be configured in production."
    );
  }

  const siteUrl = configuredUrl || "http://localhost:3000";

  const parsedUrl = new URL(siteUrl);

  if (
    process.env.NODE_ENV === "production" &&
    (parsedUrl.protocol !== "https:" ||
      ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname))
  ) {
    throw new Error(
      "Production onboarding URL must use a public HTTPS domain."
    );
  }

  return new URL(
    `/brand/onboarding?token=${encodeURIComponent(token)}`,
    parsedUrl
  ).toString();
}