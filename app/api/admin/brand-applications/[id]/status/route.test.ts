import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  findUniqueMock,
  updateMock,
  activityCreateMock,
  syncProfileMock,
  lifecycleEventMock,
} = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
  activityCreateMock: vi.fn(),
  syncProfileMock: vi.fn(),
  lifecycleEventMock: vi.fn(),
}));

vi.mock("@/lib/auth/withAdminAuth", () => ({
  withAdminAuth: (handler: unknown) => handler,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    brandApplication: {
      findUnique: findUniqueMock,
      update: updateMock,
    },
    brandApplicationActivity: {
      create: activityCreateMock,
    },
  },
}));

vi.mock("@/lib/klaviyo/brandLifecycle", () => ({
  syncBrandProfileToKlaviyo: syncProfileMock,
  sendBrandLifecycleEventToKlaviyo: lifecycleEventMock,
}));

import { PATCH } from "./route";

const APPLICATION_ID = "application-test-001";

const application = {
  id: APPLICATION_ID,
  status: "contract_signed",
  email: "brand@example.com",
  firstName: "Example",
  lastName: "Founder",
  companyName: "Example Fashion",
  phone: null,
  website: null,
  socialMedia: null,
  countryCode: null,
  city: null,
  contractSentAt: null,
  contractSignedAt: new Date(),
  contractSentPath: null,
  contractSignedPath: null,
};

function makeRequest(status: string) {
  return new Request(
    `http://localhost/api/admin/brand-applications/${APPLICATION_ID}/status`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status,
        sendEmail: false,
      }),
    }
  );
}

function context() {
  return {
    params: Promise.resolve({ id: APPLICATION_ID }),
  };
}

describe("admin brand application status API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    findUniqueMock.mockResolvedValue({ ...application });

    updateMock.mockImplementation(async ({ data }) => ({
      id: APPLICATION_ID,
      status: data.status,
      contractSentAt: null,
      contractSignedAt: application.contractSignedAt,
      contractSentPath: null,
      contractSignedPath: null,
    }));

    activityCreateMock.mockResolvedValue({ id: "activity-001" });
    syncProfileMock.mockResolvedValue(undefined);
    lifecycleEventMock.mockResolvedValue(undefined);
  });

  it("rejects manually marking an application as onboarded", async () => {
    const response = await PATCH(
      makeRequest("onboarded"),
      context()
    );

    expect(response.status).toBe(409);

    const body = await response.json();

    expect(body.ok).toBe(false);

    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(activityCreateMock).not.toHaveBeenCalled();
    expect(syncProfileMock).not.toHaveBeenCalled();
  });

  it("rejects moving an onboarded application backward", async () => {
    findUniqueMock.mockResolvedValue({
      ...application,
      status: "onboarded",
    });

    const response = await PATCH(
      makeRequest("contacted"),
      context()
    );

    expect(response.status).toBe(409);

    expect(updateMock).not.toHaveBeenCalled();
    expect(activityCreateMock).not.toHaveBeenCalled();
    expect(syncProfileMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid application status", async () => {
    const response = await PATCH(
      makeRequest("invalid_status"),
      context()
    );

    expect(response.status).toBe(400);

    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("allows a valid application status change", async () => {
    findUniqueMock.mockResolvedValue({
      ...application,
      status: "contacted",
    });

    const response = await PATCH(
      makeRequest("contract_signed"),
      context()
    );

    expect(response.status).toBe(200);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: APPLICATION_ID },
        data: expect.objectContaining({
          status: "contract_signed",
          contractSignedAt: expect.any(Date),
        }),
      })
    );

    expect(activityCreateMock).toHaveBeenCalledWith({
      data: {
        applicationId: APPLICATION_ID,
        type: "STATUS_CHANGED",
        message: "Status changed from contacted to contract_signed",
      },
    });
  });

  it("does not update an application when its status is unchanged", async () => {
    const response = await PATCH(
      makeRequest("contract_signed"),
      context()
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toMatchObject({
      ok: true,
      skipped: true,
    });

    expect(updateMock).not.toHaveBeenCalled();
    expect(activityCreateMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the application does not exist", async () => {
    findUniqueMock.mockResolvedValue(null);

    const response = await PATCH(
      makeRequest("contract_signed"),
      context()
    );

    expect(response.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });
});