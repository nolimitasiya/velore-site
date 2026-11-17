/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import NewsletterWelcomeReconciliation from "./NewsletterWelcomeReconciliation";

const events = [
  {
    id: "event-one",
    eventKey: "newsletter-welcome:subscriber-one:1",
    status: "UNKNOWN" as const,
    createdAt: new Date("2026-11-13T10:00:00.000Z"),
    updatedAt: new Date("2026-11-13T10:05:00.000Z"),
    submittedAt: new Date("2026-11-13T10:01:00.000Z"),
    providerMessageId: null,
    subscriber: { email: "first@example.test" },
    _count: { reconciliationAudits: 0 },
  },
  {
    id: "event-two",
    eventKey: "newsletter-welcome:subscriber-two:2",
    status: "UNKNOWN" as const,
    createdAt: new Date("2026-11-13T11:00:00.000Z"),
    updatedAt: new Date("2026-11-13T11:05:00.000Z"),
    submittedAt: null,
    providerMessageId: null,
    subscriber: { email: "second@example.test" },
    _count: { reconciliationAudits: 1 },
  },
];

describe("NewsletterWelcomeReconciliation table interactions", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("displays UNKNOWN events without opening a form", () => {
    render(<NewsletterWelcomeReconciliation events={events} />);

    expect(screen.getByText("first@example.test")).toBeTruthy();
    expect(screen.getByText("second@example.test")).toBeTruthy();

    expect(
      screen.getAllByRole("button", { name: "Review evidence" })
    ).toHaveLength(2);

    expect(
      screen.queryByText("Prepare reconciliation evidence")
    ).toBeNull();
  });

  it("opens the review form for the selected event", () => {
    render(<NewsletterWelcomeReconciliation events={events} />);

    const buttons = screen.getAllByRole("button", {
      name: "Review evidence",
    });

    fireEvent.click(buttons[0]);

    expect(
      screen.getByText("Prepare reconciliation evidence")
    ).toBeTruthy();

    const expandedForm = document.getElementById(
      "reconciliation-form-event-one"
    );

    expect(expandedForm).not.toBeNull();
    expect(expandedForm?.textContent).toContain(
      "newsletter-welcome:subscriber-one:1"
    );

    expect(
      screen.getByRole("button", { name: "Close review" })
        .getAttribute("aria-expanded")
    ).toBe("true");
  });

  it("closes the review form when selected again", () => {
    render(<NewsletterWelcomeReconciliation events={events} />);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Review evidence" })[0]
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Close review" })
    );

    expect(
      screen.queryByText("Prepare reconciliation evidence")
    ).toBeNull();

    expect(
      screen.getAllByRole("button", { name: "Review evidence" })
    ).toHaveLength(2);
  });

  it("only displays one review form at a time", () => {
    render(<NewsletterWelcomeReconciliation events={events} />);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Review evidence" })[0]
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Review evidence" })
    );

    expect(
      screen.getAllByText("Prepare reconciliation evidence")
    ).toHaveLength(1);

    const expandedForm = document.getElementById(
      "reconciliation-form-event-two"
    );

    expect(expandedForm).not.toBeNull();
    expect(expandedForm?.textContent).toContain(
      "newsletter-welcome:subscriber-two:2"
    );
    expect(
      document.getElementById("reconciliation-form-event-one")
    ).toBeNull();
  });

  it("does not submit API requests when opening or closing reviews", () => {
    render(<NewsletterWelcomeReconciliation events={events} />);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Review evidence" })[0]
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Close review" })
    );

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("keeps review controls associated with their event rows", () => {
    render(<NewsletterWelcomeReconciliation events={events} />);

    const row = screen
      .getByText("first@example.test")
      .closest("tr");

    expect(row).not.toBeNull();

    const button = within(row as HTMLElement).getByRole("button", {
      name: "Review evidence",
    });

    expect(button.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(button);

    expect(button.getAttribute("aria-expanded")).toBe("true");
  });
});