import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";


vi.mock("server-only", () => ({}));
const { requireAdminSessionMock } = vi.hoisted(() => ({
  requireAdminSessionMock: vi.fn(),
}));

vi.mock("@/lib/auth/AdminSession", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

vi.mock("@/lib/klaviyo/brandLifecycle", () => ({
  syncBrandProfileToKlaviyo: vi.fn().mockResolvedValue(undefined),
  sendBrandLifecycleEventToKlaviyo: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import { requireLocalSecurityTestDb } from "@/lib/testing/requireLocalSecurityTestDb";
import { GET, POST } from "./route";
import { POST as revokeInvitation } from "@/app/api/admin/brand-invites/revoke/route";

const TEST_PASSWORD = "SecurityTest123!";

const runId = randomUUID();
const brandSlug = `security-onboarding-${runId}`;

const testEmails = [
  `success-${runId}@example.invalid`,
  `rollback-${runId}@example.invalid`,
  `revoked-${runId}@example.invalid`,
];

const createdBrandIds: string[] = [];
const createdApplicationIds: string[] = [];
const createdInviteIds: string[] = [];

let databaseVerified = false;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function makeRequest(token: string, email: string) {
  return new Request("http://localhost/api/brand/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      email,
      password: TEST_PASSWORD,
    }),
  });
}

async function createFixture(
  email: string,
  status: "contract_signed" | "contacted"
) {
  if (!databaseVerified) {
    throw new Error("STOP: Database identity not verified.");
  }

  const brand = await prisma.brand.create({
  data: {
    name: `Security Onboarding ${runId}`,
    slug: `${brandSlug}-${status}-${randomUUID()}`,
  },
});

  createdBrandIds.push(brand.id);

  const application = await prisma.brandApplication.create({
    data: {
      email,
      firstName: "Security",
      lastName: "Test",
      status,
    },
  });

  createdApplicationIds.push(application.id);

  const token = randomUUID();

  const invite = await prisma.brandInvite.create({
    data: {
      email,
      tokenHash: hashToken(token),
      brandId: brand.id,
      applicationId: application.id,
      role: "owner",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  createdInviteIds.push(invite.id);

  return { brand, application, invite, token };
}

describe("Real PostgreSQL brand onboarding transaction", () => {
  beforeAll(async () => {
    await requireLocalSecurityTestDb(prisma);
    databaseVerified = true;
  });

  afterAll(async () => {
    if (!databaseVerified) {
      return;
    }

    // Recheck identity before deleting any test records.
    await requireLocalSecurityTestDb(prisma);

    // Deleting synthetic users cascades to their sessions and memberships.
    await prisma.user.deleteMany({
      where: { email: { in: testEmails } },
    });

    await prisma.brandInvite.deleteMany({
      where: { id: { in: createdInviteIds } },
    });

    await prisma.brandApplication.deleteMany({
      where: { id: { in: createdApplicationIds } },
    });

    await prisma.brand.deleteMany({
      where: { id: { in: createdBrandIds } },
    });

    // Confirm cleanup removed every synthetic record.
const [
  remainingUsers,
  remainingInvites,
  remainingApplications,
  remainingBrands,
] = await Promise.all([
  prisma.user.count({
    where: { email: { in: testEmails } },
  }),
  prisma.brandInvite.count({
    where: { id: { in: createdInviteIds } },
  }),
  prisma.brandApplication.count({
    where: { id: { in: createdApplicationIds } },
  }),
  prisma.brand.count({
    where: { id: { in: createdBrandIds } },
  }),
]);

expect(remainingUsers).toBe(0);
expect(remainingInvites).toBe(0);
expect(remainingApplications).toBe(0);
expect(remainingBrands).toBe(0);

console.log("PASS: All synthetic onboarding test records removed.");
  });

  it("commits successful onboarding and marks the application onboarded", async () => {
    const email = testEmails[0];

    const fixture = await createFixture(email, "contract_signed");

    const response = await POST(makeRequest(fixture.token, email));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    const user = await prisma.user.findUnique({
      where: { email },
    });

    expect(user).not.toBeNull();

    const membership = await prisma.brandMembership.findFirst({
      where: {
        userId: user!.id,
        brandId: fixture.brand.id,
      },
    });

    expect(membership?.role).toBe("owner");

    const sessions = await prisma.brandAuthSession.findMany({
      where: { userId: user!.id },
    });

    expect(sessions).toHaveLength(1);

    const invite = await prisma.brandInvite.findUnique({
      where: { id: fixture.invite.id },
    });

    expect(invite?.usedAt).not.toBeNull();

    const application = await prisma.brandApplication.findUnique({
      where: { id: fixture.application.id },
    });

    expect(application?.status).toBe("onboarded");

    expect(response.headers.get("set-cookie")).toContain("brand_authed=");
  });

  it("rolls back all onboarding changes when the application is ineligible", async () => {
    const email = testEmails[1];

    const fixture = await createFixture(email, "contacted");

    const response = await POST(makeRequest(fixture.token, email));

    expect(response.status).toBe(409);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    expect(user).toBeNull();

    const memberships = await prisma.brandMembership.findMany({
      where: { brandId: fixture.brand.id },
    });

    expect(memberships).toHaveLength(0);

// Verify that no authentication session survived the failed transaction.
// We use a database join to check sessions associated with this test email.
const sessions = await prisma.$queryRaw<Array<{ count: bigint }>>`
  SELECT COUNT(*) AS count
  FROM "BrandAuthSession" s
  INNER JOIN "User" u ON u.id = s."userId"
  WHERE u.email = ${email}
`;

expect(Number(sessions[0]?.count)).toBe(0);

const invite = await prisma.brandInvite.findUnique({
      where: { id: fixture.invite.id },
    });

    expect(invite?.usedAt).toBeNull();

    const application = await prisma.brandApplication.findUnique({
      where: { id: fixture.application.id },
    });

    expect(application?.status).toBe("contacted");

    // Failed onboarding must not issue an authentication cookie.
    expect(response.headers.has("set-cookie")).toBe(false);
  });
  it("prevents onboarding after an admin revokes an invitation", async () => {
  const email = testEmails[2];

  const fixture = await createFixture(email, "contract_signed");

  // Confirm the invitation starts unused.
  expect(fixture.invite.usedAt).toBeNull();

  // Simulate an authenticated administrator.
  requireAdminSessionMock.mockResolvedValue({
    id: "security-test-admin",
  });

  // STEP 1: Revoke through the actual admin API.
  const revokeResponse = await revokeInvitation(
    new Request("http://localhost/api/admin/brand-invites/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: fixture.invite.id,
      }),
    })
  );

  expect(revokeResponse.status).toBe(200);
  expect(await revokeResponse.json()).toEqual({ ok: true });

  // STEP 2: Verify revocation was persisted in PostgreSQL.
  const revokedInvite = await prisma.brandInvite.findUnique({
    where: { id: fixture.invite.id },
  });

  expect(revokedInvite).not.toBeNull();
  expect(revokedInvite?.usedAt).toBeInstanceOf(Date);

  const originalRevokedAt = revokedInvite!.usedAt!.getTime();

  // STEP 3: Revoking again must not overwrite the timestamp.
  const secondRevokeResponse = await revokeInvitation(
    new Request("http://localhost/api/admin/brand-invites/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: fixture.invite.id,
      }),
    })
  );

  expect(secondRevokeResponse.status).toBe(409);

  const afterSecondRevoke = await prisma.brandInvite.findUnique({
    where: { id: fixture.invite.id },
  });

  expect(afterSecondRevoke?.usedAt?.getTime()).toBe(
    originalRevokedAt
  );

  // STEP 4: The actual onboarding GET endpoint must reject the token.
  const getResponse = await GET(
    new Request(
      `http://localhost/api/brand/onboarding?token=${encodeURIComponent(
        fixture.token
      )}`
    )
  );

  expect(getResponse.status).toBe(400);

  // STEP 5: The actual onboarding POST endpoint must also reject it.
  const postResponse = await POST(
    makeRequest(fixture.token, email)
  );

  expect(postResponse.status).toBe(400);
  expect(postResponse.headers.has("set-cookie")).toBe(false);

  // STEP 6: Verify no account was created.
  const user = await prisma.user.findUnique({
    where: { email },
  });

  expect(user).toBeNull();

  // No authentication session can exist for this synthetic account.
  const sessions = await prisma.$queryRaw<
    Array<{ count: bigint }>
  >`
    SELECT COUNT(*)::bigint AS count
    FROM "BrandAuthSession" s
    JOIN "User" u ON u.id = s."userId"
    WHERE u.email = ${email}
  `;

  expect(Number(sessions[0].count)).toBe(0);

  // STEP 7: The application must remain contract_signed.
  const application = await prisma.brandApplication.findUnique({
    where: { id: fixture.application.id },
  });

  expect(application?.status).toBe("contract_signed");

  // STEP 8: The invitation must remain revoked.
  const finalInvite = await prisma.brandInvite.findUnique({
    where: { id: fixture.invite.id },
  });

  expect(finalInvite?.usedAt?.getTime()).toBe(
    originalRevokedAt
  );

  console.log(
    "PASS: Revoked invitation cannot be redeemed through onboarding."
  );
});
});