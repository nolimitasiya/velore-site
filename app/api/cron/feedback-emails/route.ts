import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  dispatchFeedbackEmails,
} from "@/lib/feedback/dispatchFeedbackEmails";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "[feedback-emails-cron] CRON_SECRET is not configured"
    );

    return NextResponse.json(
      { error: "Cron configuration error." },
      { status: 500 }
    );
  }

  const authorization =
    request.headers.get("authorization");

  if (authorization !== `Bearer ${cronSecret}`) {
    console.warn(
      "[feedback-emails-cron] Unauthorized request rejected"
    );

    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

 if (process.env.FEEDBACK_EMAIL_CRON_ENABLED !== "true") {
    return NextResponse.json({
      ok: true,
      enabled: false,
      message: "Feedback email delivery is not enabled.",
    });
  }

  try {
    const result = await dispatchFeedbackEmails();

    console.log(
      "[feedback-emails-cron] Run completed",
      result
    );

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch {
    console.error(
      "[feedback-emails-cron] Run failed"
    );

    return NextResponse.json(
      { error: "Feedback email dispatch failed." },
      { status: 500 }
    );
  }
}