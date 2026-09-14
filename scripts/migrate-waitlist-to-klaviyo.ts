/// <reference types="node" />

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const KLAVIYO_API_URL = "https://a.klaviyo.com/api";
const KLAVIYO_REVISION = "2026-07-15";

const DRY_RUN = process.env.DRY_RUN !== "false";

function klaviyoHeaders(apiKey: string) {
  return {
    Authorization: `Klaviyo-API-Key ${apiKey}`,
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    revision: KLAVIYO_REVISION,
  };
}

async function upsertProfile(params: {
  email: string;
  name: string;
  countryCode?: string | null;
}) {
  const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing KLAVIYO_PRIVATE_API_KEY");
  }

  const response = await fetch(
    `${KLAVIYO_API_URL}/profile-import`,
    {
      method: "POST",
      headers: klaviyoHeaders(apiKey),
      body: JSON.stringify({
        data: {
          type: "profile",
          attributes: {
            email: params.email,
            first_name: params.name,
            ...(params.countryCode
              ? {
                  location: {
                    country: params.countryCode,
                  },
                }
              : {}),
            properties: {
                  waitlist_member: true,
                },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Profile upsert failed (${response.status}): ${errorText}`
    );
  }
}

async function subscribeHistorical(params: {
  email: string;
  consentedAt: Date;
}) {
  const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;
  const listId = process.env.KLAVIYO_WAITLIST_LIST_ID;

  if (!apiKey) {
    throw new Error("Missing KLAVIYO_PRIVATE_API_KEY");
  }

  if (!listId) {
    throw new Error("Missing KLAVIYO_WAITLIST_LIST_ID");
  }

  const response = await fetch(
    `${KLAVIYO_API_URL}/profile-subscription-bulk-create-jobs`,
    {
      method: "POST",
      headers: klaviyoHeaders(apiKey),
      body: JSON.stringify({
        data: {
          type: "profile-subscription-bulk-create-job",
          attributes: {
            profiles: {
              data: [
                {
                  type: "profile",
                  attributes: {
                    email: params.email,
                    subscriptions: {
                      email: {
                        marketing: {
                          consent: "SUBSCRIBED",
                          consented_at:
                            params.consentedAt.toISOString(),
                        },
                      },
                    },
                  },
                },
              ],
            },
            historical_import: true,
          },
          relationships: {
            list: {
              data: {
                type: "list",
                id: listId,
              },
            },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Historical subscription failed (${response.status}): ${errorText}`
    );
  }
}

async function main() {
  console.log("========================================");
  console.log("Veilora Waitlist → Klaviyo");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE SYNC"}`);
  console.log("========================================");

  const subscribers = await prisma.waitlistSubscriber.findMany({
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      countryCode: true,
      createdAt: true,
    },
  });

  console.log(`Total waitlist records: ${subscribers.length}`);

  let synced = 0;
  let failed = 0;

  for (const subscriber of subscribers) {
    const email = subscriber.email.trim().toLowerCase();

    console.log(
      `${email} | ${subscriber.name} | ${subscriber.createdAt.toISOString()}`
    );

    if (DRY_RUN) {
      continue;
    }

    try {
      await upsertProfile({
        email,
        name: subscriber.name,
        countryCode: subscriber.countryCode,
      });

     // await subscribeHistorical({
       // email,
        //consentedAt: subscriber.createdAt,
      //});

      synced++;

      console.log(`[synced] ${email}`);
    } catch (error) {
      failed++;

      console.error(
        `[failed] ${email}`,
        error
      );
    }
  }

  console.log("");
  console.log("========================================");

  if (DRY_RUN) {
    console.log("DRY RUN COMPLETE");
    console.log(`Would sync: ${subscribers.length}`);
  } else {
    console.log("MIGRATION COMPLETE");
    console.log(`Synced: ${synced}`);
    console.log(`Failed: ${failed}`);
  }

  console.log("========================================");
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });