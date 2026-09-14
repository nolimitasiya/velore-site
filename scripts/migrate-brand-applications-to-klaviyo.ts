/// <reference types="node" />

import { PrismaClient } from "@prisma/client";
import { syncBrandProfileToKlaviyo } from "../lib/klaviyo/brandLifecycle";
const prisma = new PrismaClient();

const DRY_RUN = process.env.DRY_RUN !== "false";


async function main() {
  console.log("========================================");
  console.log("Veilora Brand Application → Klaviyo");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE SYNC"}`);
  console.log("========================================");

  const applications = await prisma.brandApplication.findMany({
    orderBy: [
      { updatedAt: "desc" },
      { createdAt: "desc" },
    ],
    select: {
      id: true,

      email: true,
      firstName: true,
      lastName: true,

      companyName: true,
      phone: true,
      website: true,
      socialMedia: true,

      countryCode: true,
      city: true,

      status: true,
      applicationSource: true,

      createdAt: true,
      updatedAt: true,
    },
  });

  console.log(`Total BrandApplication records: ${applications.length}`);

  /*
   * Klaviyo profiles are effectively keyed/upserted by email.
   *
   * Keep only the most recently updated BrandApplication
   * for each normalized email address.
   */
  const latestByEmail = new Map<
    string,
    (typeof applications)[number]
  >();

  const duplicateEmails = new Map<
    string,
    Array<(typeof applications)[number]>
  >();

  for (const application of applications) {
    const email = application.email.trim().toLowerCase();

    if (!email) {
      console.warn(
        "[skip] Application has no usable email:",
        application.id
      );
      continue;
    }

    const existing = latestByEmail.get(email);

    if (!existing) {
      latestByEmail.set(email, application);
      duplicateEmails.set(email, [application]);
      continue;
    }

    duplicateEmails.get(email)?.push(application);

    /*
     * Because findMany is already ordered updatedAt DESC,
     * the first record stored for this email remains the winner.
     */
  }

  const duplicates = [...duplicateEmails.entries()].filter(
    ([, records]) => records.length > 1
  );

  console.log("");
  console.log(`Unique email profiles: ${latestByEmail.size}`);
  console.log(`Duplicate email groups: ${duplicates.length}`);

  if (duplicates.length > 0) {
    console.log("");
    console.log("DUPLICATES FOUND");
    console.log("----------------------------------------");

    for (const [email, records] of duplicates) {
      console.log(`\n${email}`);

      for (const record of records) {
        console.log(
          `  ${record.id} | ${record.status} | updated ${record.updatedAt.toISOString()}`
        );
      }

      const winner = latestByEmail.get(email);

      console.log(
        `  → selected: ${winner?.id} (${winner?.status})`
      );
    }
  }

  console.log("");
  console.log("PROFILES TO SYNC");
  console.log("----------------------------------------");

  let synced = 0;
  let failed = 0;

  for (const [email, application] of latestByEmail) {
    console.log(
      `${email} → ${application.status} | ${application.companyName ?? "No company name"}`
    );

    if (DRY_RUN) {
      continue;
    }

    try {
      /*
       * CRITICAL:
       * PROFILE SYNC ONLY.
       *
       * Do NOT call sendBrandLifecycleEventToKlaviyo here.
       */
      await syncBrandProfileToKlaviyo({
        applicationId: application.id,

        firstName: application.firstName,
        lastName: application.lastName,
        email: application.email,

        companyName: application.companyName,
        phone: application.phone,
        website: application.website,
        socialMedia: application.socialMedia,

        countryCode: application.countryCode,
        city: application.city,

        stage: application.status,
      });

      synced++;

      console.log(
        `[synced] ${email} → ${application.status}`
      );
    } catch (error) {
      failed++;

      console.error(
        `[failed] ${email} → ${application.status}`,
        error
      );
    }
  }

  console.log("");
  console.log("========================================");

  if (DRY_RUN) {
    console.log("DRY RUN COMPLETE");
    console.log(`Would sync: ${latestByEmail.size} profiles`);
  } else {
    console.log("MIGRATION COMPLETE");
    console.log(`Synced: ${synced}`);
    console.log(`Failed: ${failed}`);
  }

  console.log(`Duplicate email groups: ${duplicates.length}`);
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