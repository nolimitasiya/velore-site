import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";
import { syncWaitlistSubscriberToKlaviyo } from "@/lib/klaviyo/waitlist";
import { ANALYTICS_SESSION_COOKIE } from "@/lib/analytics/session";

export const runtime = "nodejs";

function capitaliseName(
  input: string
) {
  return input
    .trim()
    .toLowerCase()
    .replace(
      /\b\w/g,
      (c) => c.toUpperCase()
    );
}

function displayName(
  rawName: string,
  email: string
) {
  const n =
    (rawName || "").trim();

  if (
    !n ||
    n.includes("@")
  ) {
    const local =
      (
        email.split("@")[0] ||
        "there"
      )
        .replace(
          /[._-]+/g,
          " "
        )
        .trim();

    return local
      ? capitaliseName(local)
      : "There";
  }

  return capitaliseName(n);
}

export async function POST(
  req: NextRequest
) {
  const body = await req
    .json()
    .catch(() => ({}));

  const email =
    String(
      body.email || ""
    )
      .trim()
      .toLowerCase();

  const rawName =
    String(
      body.name || ""
    );

  if (
    !rawName.trim() ||
    !email
  ) {
    return NextResponse.json(
      {
        error:
          "Missing name or email",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !email.includes("@")
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid email",
      },
      {
        status: 400,
      }
    );
  }

  const friendlyName =
    displayName(
      rawName,
      email
    );

  try {
    /*
     * Resolve the visitor's
     * current analytics session.
     */
    const analyticsSessionId =
      req.cookies
        .get(
          ANALYTICS_SESSION_COOKIE
        )
        ?.value
        ?.trim() || null;

    const analyticsSession =
      analyticsSessionId
        ? await prisma.analyticsSession.findUnique({
            where: {
              id:
                analyticsSessionId,
            },

            select: {
              id: true,

              acquisitionSource:
                true,

              acquisitionMedium:
                true,

              acquisitionCampaign:
                true,

              acquisitionContent:
                true,

              acquisitionTerm:
                true,

              landingPath:
                true,

              referrer:
                true,
            },
          })
        : null;

    /*
     * Check whether this email
     * already joined the waitlist.
     */
    const existingSubscriber =
      await prisma.waitlistSubscriber.findUnique({
        where: {
          email,
        },
      });

    if (
      existingSubscriber
    ) {
      /*
       * Keep their name current,
       * but preserve their original
       * signup attribution and do
       * not trigger Klaviyo again.
       */
      if (
        existingSubscriber.name !==
        friendlyName
      ) {
        await prisma.waitlistSubscriber.update({
          where: {
            email,
          },

          data: {
            name:
              friendlyName,
          },
        });
      }

      return NextResponse.json({
        ok: true,
        alreadyJoined: true,
      });
    }

    /*
     * Snapshot acquisition
     * attribution at the exact
     * moment of conversion.
     */
    await prisma.waitlistSubscriber.create({
      data: {
        name:
          friendlyName,

        email,

        analyticsSessionId:
          analyticsSession?.id ??
          null,

        acquisitionSource:
          analyticsSession
            ?.acquisitionSource ??
          null,

        acquisitionMedium:
          analyticsSession
            ?.acquisitionMedium ??
          null,

        acquisitionCampaign:
          analyticsSession
            ?.acquisitionCampaign ??
          null,

        acquisitionContent:
          analyticsSession
            ?.acquisitionContent ??
          null,

        acquisitionTerm:
          analyticsSession
            ?.acquisitionTerm ??
          null,

        landingPath:
          analyticsSession
            ?.landingPath ??
          null,

        referrer:
          analyticsSession
            ?.referrer ??
          null,
      },
    });

    /*
     * Existing Klaviyo behaviour
     * remains unchanged.
     */
    try {
      await syncWaitlistSubscriberToKlaviyo({
  email,

  name:
    friendlyName,

  attribution: {
    source:
      analyticsSession
        ?.acquisitionSource ??
      null,

    medium:
      analyticsSession
        ?.acquisitionMedium ??
      null,

    campaign:
      analyticsSession
        ?.acquisitionCampaign ??
      null,

    content:
      analyticsSession
        ?.acquisitionContent ??
      null,

    term:
      analyticsSession
        ?.acquisitionTerm ??
      null,

    referrer:
      analyticsSession
        ?.referrer ??
      null,

    landingPath:
      analyticsSession
        ?.landingPath ??
      null,
  },
});
    } catch (err) {
      console.error(
        "[waitlist] Klaviyo sync failed",
        err
      );
    }

    return NextResponse.json({
      ok: true,
      alreadyJoined: false,
    });
  } catch (e) {
    console.error(
      "[waitlist] DB error",
      e
    );

    return NextResponse.json(
      {
        error:
          "Server error",
      },
      {
        status: 500,
      }
    );
  }
}