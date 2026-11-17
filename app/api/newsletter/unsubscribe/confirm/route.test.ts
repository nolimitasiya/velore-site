import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  queryRaw: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  transaction: vi.fn(),
  lock: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/marketing/lockNewsletterEmail", () => ({
  lockNewsletterEmail: mocks.lock,
}));

vi.mock(
  "@/lib/resend/templates/marketing/newsletterUnsubscribed",
  () => ({
    sendNewsletterUnsubscribedEmail: mocks.sendEmail,
  })
);

import { POST } from "./route";

const subscriber = {
  id: "subscriber-1",
  email: "shopper@example.test",
  status: "subscribed",
};

function request(token?: string) {
  return new Request(
    "http://localhost:3000/api/newsletter/unsubscribe/confirm",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        token === undefined ? {} : { token }
      ),
    }
  );
}

describe("Newsletter unsubscribe POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.findFirst.mockResolvedValue({
      id: subscriber.id,
      email: subscriber.email,
    });

    mocks.queryRaw.mockResolvedValue([subscriber]);

    mocks.update.mockResolvedValue({
      ...subscriber,
      status: "unsubscribed",
    });

    mocks.updateMany.mockResolvedValue({ count: 1 });

    mocks.lock.mockResolvedValue(undefined);
    mocks.sendEmail.mockResolvedValue(undefined);

    mocks.transaction.mockImplementation(async (callback) => {
      const tx = {
        newsletterSubscriber: {
          findFirst: mocks.findFirst,
          update: mocks.update,
        },
        newsletterWelcomeEvent: {
          updateMany: mocks.updateMany,
        },
        $queryRaw: mocks.queryRaw,
      };

      return callback(tx);
    });
  });

  it("rejects a missing token", async () => {
    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Missing token",
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("rejects an invalid token", async () => {
    mocks.findFirst.mockResolvedValue(null);

    const response = await POST(request("invalid-token"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Invalid or expired link",
    });

    expect(mocks.lock).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("unsubscribes under the shared lock and cancels eligible welcome events", async () => {
    const response = await POST(request("valid-token"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    expect(mocks.lock).toHaveBeenCalledWith(
      expect.anything(),
      subscriber.email
    );

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: subscriber.id },
      data: {
        status: "unsubscribed",
        unsubscribedAt: expect.any(Date),
        confirmToken: null,
      },
    });

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        subscriberId: subscriber.id,
        status: {
          in: ["PENDING", "FAILED"],
        },
      },
      data: {
        status: "CANCELLED",
        nextAttemptAt: null,
      },
    });

    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    expect(mocks.sendEmail).toHaveBeenCalledWith({
      to: subscriber.email,
    });
  });

  it("does not send another email when already unsubscribed", async () => {
    mocks.queryRaw.mockResolvedValue([
      { ...subscriber, status: "unsubscribed" },
    ]);

    const response = await POST(request("valid-token"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();

    expect(mocks.updateMany).toHaveBeenCalledOnce();
  });

  it("does not cancel in-flight or uncertain welcome events", async () => {
    await POST(request("valid-token"));

    const cancellation = mocks.updateMany.mock.calls[0][0];

    expect(cancellation.where.status.in).toEqual([
      "PENDING",
      "FAILED",
    ]);

    expect(cancellation.where.status.in).not.toContain(
      "PROCESSING"
    );

    expect(cancellation.where.status.in).not.toContain(
      "SUBMITTING"
    );

    expect(cancellation.where.status.in).not.toContain(
      "UNKNOWN"
    );
  });

  it("does not send email when the transaction fails", async () => {
    mocks.update.mockRejectedValue(
      new Error("Simulated database failure")
    );

    await expect(
      POST(request("valid-token"))
    ).rejects.toThrow("Simulated database failure");

    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("preserves successful withdrawal when the goodbye email fails", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      mocks.sendEmail.mockRejectedValue(
        new Error("Simulated email failure")
      );

      const response = await POST(request("valid-token"));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });

      expect(mocks.update).toHaveBeenCalledOnce();
      expect(errorSpy).toHaveBeenCalledOnce();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("rejects a subscriber whose token no longer matches after locking", async () => {
    mocks.queryRaw.mockResolvedValue([]);

    const response = await POST(request("expired-token"));

    expect(response.status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});