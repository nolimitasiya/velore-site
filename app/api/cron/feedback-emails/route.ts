import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  dispatchFeedbackEmails,
} from "@/lib/feedback/dispatchFeedbackEmails";

import {
  dispatchShopperWelcomeEmails,
} from "@/lib/email/dispatchShopperWelcomeEmails";

import {
  countStuckShopperWelcomeEmails,
} from "@/lib/email/countStuckShopperWelcomeEmails";

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
  const feedbackEnabled =
    process.env.FEEDBACK_EMAIL_CRON_ENABLED === "true";

  const welcomeEnabled =
    process.env.SHOPPER_WELCOME_EMAIL_CRON_ENABLED === "true";

  if (!feedbackEnabled && !welcomeEnabled) {
    return NextResponse.json({
      ok: true,
      enabled: false,
      message: "Scheduled email delivery is not enabled.",
    });
  }

  const results: {
    feedback?: Awaited<ReturnType<typeof dispatchFeedbackEmails>>;
    welcome?: Awaited<ReturnType<typeof dispatchShopperWelcomeEmails>>;
    welcomeStuckClaims?: number;
  } = {};

  let failed = false;

  if (feedbackEnabled) {
    try {
      results.feedback = await dispatchFeedbackEmails();
    } catch (error) {
      failed = true;
      console.error(
        "[feedback-emails-cron] Feedback dispatch failed",
        error
      );
    }
  }

  if (welcomeEnabled) {
    try {
      results.welcome = await dispatchShopperWelcomeEmails();
    } catch (error) {
      failed = true;
      console.error(
        "[feedback-emails-cron] Welcome dispatch failed",
        error
      );
    }

    try {
      results.welcomeStuckClaims =
        await countStuckShopperWelcomeEmails();

      if (results.welcomeStuckClaims > 0) {
        console.warn(
          "[feedback-emails-cron] Stuck welcome-email claims detected",
          { count: results.welcomeStuckClaims }
        );
      }
    } catch (error) {
      failed = true;
      console.error(
        "[feedback-emails-cron] Stuck-claim monitoring failed",
        error
      );
    }
  }

  console.log("[feedback-emails-cron] Run completed", {
    feedbackEnabled,
    welcomeEnabled,
    failed,
    results,
  });

  return NextResponse.json(
    {
      ok: !failed,
      feedbackEnabled,
      welcomeEnabled,
      ...results,
    },
    { status: failed ? 500 : 200 }
  );
}