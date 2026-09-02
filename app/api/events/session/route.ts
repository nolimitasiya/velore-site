import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  attachAnalyticsSessionCookie,
  getOrCreateAnalyticsSession,
} from "@/lib/analytics/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest
) {
  try {
    const {
      sessionId,
      isNew,
    } =
      await getOrCreateAnalyticsSession(
        req
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