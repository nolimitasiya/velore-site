import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";

import { createNewsletterSubscription } from "@/lib/marketing/createNewsletterSubscription";
import { sendNewsletterConfirmEmail } from "@/lib/resend/templates/marketing/newsletterConfirm";
import { getSiteBaseUrl } from "@/lib/config/siteUrl";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().email(),
  source: z.string().trim().max(50).optional(),
  tags: z.array(z.string().trim().max(30)).optional(),
});

export async function POST(req: Request) {
  try {
    getSiteBaseUrl();
  } catch {
    console.error("Newsletter subscription URL configuration unavailable.");

    return NextResponse.json(
      { ok: false, error: "Server configuration unavailable." },
      { status: 503 }
    );
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY");

    return NextResponse.json(
      { ok: false, error: "Server misconfigured: missing RESEND_API_KEY" },
      { status: 500 }
    );
  }

  if (
    !process.env.RESEND_FROM_MARKETING &&
    !process.env.RESEND_FROM_ONBOARDING
  ) {
    console.error("Missing RESEND_FROM_*");

    return NextResponse.json(
      { ok: false, error: "Server misconfigured: missing RESEND_FROM" },
      { status: 500 }
    );
  }

  try {
    const json = await req.json();
    const body = BodySchema.parse(json);

    let result;

    try {
      result = await createNewsletterSubscription({
        email: body.email,
        source: body.source,
        tags: body.tags,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          "Newsletter subscription blocked by account marketing consent."
      ) {
        // Do not disclose account marketing preferences.
        return NextResponse.json({
          ok: true,
          status: "pending",
        });
      }

      throw error;
    }

    if (!result.sendConfirmation) {
      return NextResponse.json({
        ok: true,
        status: "subscribed",
      });
    }

    await sendNewsletterConfirmEmail({
      to: result.email,
      confirmToken: result.confirmToken,
      unsubscribeToken: result.unsubscribeToken,
    });

    return NextResponse.json({
      ok: true,
      status: "pending",
    });
  } catch (error) {
    const debugId = crypto.randomBytes(6).toString("hex");

    console.error(
      "Newsletter subscription failed.",
      { debugId, error }
    );

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid input.",
        },
        { status: 400 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Something went wrong.",
        debugId,
      },
      { status: 500 }
    );
  }
}