import "server-only";
import { getVercelOidcToken } from "@vercel/oidc";

import { cookies } from "next/headers";

const ADMIN_ANALYTICS_PREFIX = "/api/admin/analytics/";

function getApprovedOrigin(): string {
  const isVercel = Boolean(process.env.VERCEL);

  if (isVercel) {
    const environment = process.env.VERCEL_ENV;

    if (
      environment !== "production" &&
      environment !== "preview" &&
      environment !== "development"
    ) {
      throw new Error(
        "Admin analytics deployment environment is invalid."
      );
    }

    const deploymentHost = process.env.VERCEL_URL?.trim();

    if (!deploymentHost) {
      throw new Error(
        "Admin analytics deployment hostname is missing."
      );
    }

    if (
      !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(deploymentHost) ||
      deploymentHost.includes("..") ||
      !deploymentHost.includes(".")
    ) {
      throw new Error(
        "Admin analytics deployment hostname is invalid."
      );
    }

    const hostname = deploymentHost.toLowerCase();

    // Trust VERCEL_URL only as Vercel-managed deployment metadata.
    // Never substitute request Host headers or NEXT_PUBLIC_SITE_URL.
    // The hostname is not independently verified as project-owned.
    if (
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.vercel\.app$/.test(hostname)
    ) {
      throw new Error(
        "Admin analytics requires a Vercel deployment hostname."
      );
    }

    const deploymentUrl = new URL(`https://${deploymentHost}`);

    if (
      deploymentUrl.hostname !== hostname ||
      deploymentUrl.port ||
      deploymentUrl.protocol !== "https:"
    ) {
      throw new Error(
        "Admin analytics deployment hostname is invalid."
      );
    }

    return deploymentUrl.origin;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Admin analytics production deployment identity is missing."
    );
  }

  return "http://localhost:3000";
}
function validateAnalyticsPath(path: string): void {
  if (
    !path.startsWith(ADMIN_ANALYTICS_PREFIX) ||
    path.includes("\\") ||
    path.includes("#")
  ) {
    throw new Error(
      "Invalid Admin analytics API path."
    );
  }

  const pathname = path.split("?", 1)[0];

  const segments = pathname.split("/");

  for (const segment of segments) {
    let decoded: string;

    try {
      decoded = decodeURIComponent(segment);
    } catch {
      throw new Error(
        "Invalid Admin analytics API path encoding."
      );
    }

    if (
      decoded === "." ||
      decoded === ".." ||
      decoded.includes("/") ||
      decoded.includes("\\") ||
      decoded.includes("%") ||
      /[\u0000-\u001f\u007f]/.test(decoded)
    ) {
      throw new Error(
        "Unsafe Admin analytics API path."
      );
    }
  }
}

export async function fetchAdminAnalytics(
  path: string
): Promise<Response> {
  validateAnalyticsPath(path);

  const origin = getApprovedOrigin();

  const url = new URL(path, `${origin}/`);

  if (
    url.origin !== origin ||
    !url.pathname.startsWith(ADMIN_ANALYTICS_PREFIX)
  ) {
    throw new Error(
      "Admin analytics request escaped its approved destination."
    );
  }

  const jar = await cookies();
  const token = jar.get("admin_authed")?.value;

  if (!token) {
    throw new Error(
      "Admin authentication is required."
    );
  }

  if (/[;\r\n]/.test(token)) {
    throw new Error(
      "Invalid Admin authentication cookie."
    );
  }

  const headers: Record<string, string> = {
    cookie: `admin_authed=${token}`,
  };

  if (process.env.VERCEL) {
    let oidcToken: string;

    try {
      oidcToken = await getVercelOidcToken();
    } catch {
      throw new Error("Admin analytics deployment authentication unavailable.");
    }

    if (!oidcToken || !oidcToken.trim()) {
      throw new Error("Admin analytics deployment authentication unavailable.");
    }

    headers["x-vercel-trusted-oidc-idp-token"] = oidcToken;
  }

  return fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
    redirect: "error",
    headers,
  });
}