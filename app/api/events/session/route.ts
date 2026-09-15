import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  attachAnalyticsAttributionCookie,
  attachAnalyticsSessionCookie,
  getOrCreateAnalyticsSession,
} from "@/lib/analytics/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest
) {
  try {
    const body = await req
      .json()
      .catch(() => ({}));

    const attribution = {
      utmSource:
        typeof body.utmSource === "string"
          ? body.utmSource
          : null,

      utmMedium:
        typeof body.utmMedium === "string"
          ? body.utmMedium
          : null,

      utmCampaign:
        typeof body.utmCampaign === "string"
          ? body.utmCampaign
          : null,

      utmContent:
        typeof body.utmContent === "string"
          ? body.utmContent
          : null,

      utmTerm:
        typeof body.utmTerm === "string"
          ? body.utmTerm
          : null,

      landingPath:
        typeof body.landingPath === "string"
          ? body.landingPath
          : null,

      referrer:
        typeof body.referrer === "string"
          ? body.referrer
          : null,
    };

    const {
  sessionId,
  isNew,
  attribution: resolvedAttribution,
  shouldSetAttributionCookie,
} =
  await getOrCreateAnalyticsSession(
    req,
    attribution
  );

    const response =
      NextResponse.json({
        ok: true,
        sessionId,
        isNew,
      });

    attachAnalyticsSessionCookie(
      response,
      sessionId
    );

    if (
  shouldSetAttributionCookie &&
  resolvedAttribution
) {
  attachAnalyticsAttributionCookie(
    response,
    resolvedAttribution
  );
}

    return response;
  } catch (error) {
    console.error(
      "Analytics session bootstrap failed",
      error
    );

    return NextResponse.json(
      {
        ok: false,
      },
      {
        status: 200,
      }
    );
  }
}