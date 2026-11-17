import { describe, expect, it } from "vitest";

import {
  decideNewsletterSubscriptionGeneration,
} from "./newsletterSubscriptionGeneration";

describe("newsletter subscription generation decisions", () => {
  it("starts new subscribers at generation zero", () => {
    expect(decideNewsletterSubscriptionGeneration(null)).toEqual({
      nextStatus: "pending",
      incrementGeneration: false,
      sendConfirmation: true,
    });
  });

  it("does not advance generation for pending subscribers", () => {
    expect(decideNewsletterSubscriptionGeneration("pending")).toEqual({
      nextStatus: "pending",
      incrementGeneration: false,
      sendConfirmation: true,
    });
  });

  it("does not advance generation for subscribed subscribers", () => {
    expect(decideNewsletterSubscriptionGeneration("subscribed")).toEqual({
      nextStatus: "subscribed",
      incrementGeneration: false,
      sendConfirmation: false,
    });
  });

  it("advances generation once when restarting an unsubscribed lifecycle", () => {
    expect(decideNewsletterSubscriptionGeneration("unsubscribed")).toEqual({
      nextStatus: "pending",
      incrementGeneration: true,
      sendConfirmation: true,
    });
  });
});