function normalizeBaseUrl(
  value: string | undefined
) {
  const normalized =
    value?.trim().replace(/\/+$/, "");

  if (!normalized) {
    return null;
  }

  try {
    const url = new URL(normalized);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export function getPlatformHealthConfig() {
  const baseUrl = normalizeBaseUrl(
    process.env.PLATFORM_HEALTH_BASE_URL
  );

  const healthCheckSecret =
    process.env
      .PLATFORM_HEALTH_HEADER_SECRET
      ?.trim() || null;

  return {
    baseUrl,
    healthCheckSecret,
  };
}