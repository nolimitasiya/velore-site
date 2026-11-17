/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import NewsletterWelcomeReconciliationForm from "./NewsletterWelcomeReconciliationForm";

const EVENT_ID = "event-test-123";
const EVENT_KEY = "newsletter-welcome:subscriber-123:1";

function renderForm() {
  return render(
    <NewsletterWelcomeReconciliationForm
      eventId={EVENT_ID}
      eventKey={EVENT_KEY}
    />
  );
}

function fillEvidence() {
  fireEvent.change(screen.getByLabelText("Evidence reference"), {
    target: { value: "Provider dashboard record 123" },
  });

  fireEvent.change(screen.getByLabelText("Investigation notes"), {
    target: { value: "Evidence independently reviewed." },
  });
}

function acknowledgeEvidence() {
  fireEvent.click(screen.getByRole("checkbox"));
}

function validate() {
  fireEvent.click(
    screen.getByRole("button", {
      name: "Validate evidence details",
    })
  );
}

describe("NewsletterWelcomeReconciliationForm interactions", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("defaults to UNCERTAIN", () => {
    renderForm();

    const select = screen.getByLabelText(
      "Provider evidence outcome"
    ) as HTMLSelectElement;

    expect(select.value).toBe("UNCERTAIN");
  });

  it("requires independent evidence acknowledgement", () => {
    renderForm();

    fillEvidence();
    validate();

    expect(
      screen.getByRole("alert").textContent
    ).toContain("independently reviewed");

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("rejects missing evidence details", () => {
    renderForm();

    acknowledgeEvidence();
    validate();

    expect(
      screen.getByRole("alert").textContent
    ).toContain("evidence reference");

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("requires a provider message ID for ACCEPTED", () => {
    renderForm();

    fireEvent.change(
      screen.getByLabelText("Provider evidence outcome"),
      { target: { value: "ACCEPTED" } }
    );

    fillEvidence();
    acknowledgeEvidence();
    validate();

    expect(
      screen.getByRole("alert").textContent
    ).toContain("provider message ID");

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("validates complete UNCERTAIN evidence without submission", () => {
    renderForm();

    fillEvidence();
    acknowledgeEvidence();
    validate();

    expect(
      screen.getByRole("status").textContent
    ).toContain("Form validation passed");

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("validates complete ACCEPTED evidence without submission", () => {
    renderForm();

    fireEvent.change(
      screen.getByLabelText("Provider evidence outcome"),
      { target: { value: "ACCEPTED" } }
    );

    fillEvidence();

    fireEvent.change(
      screen.getByLabelText("Verified provider message ID"),
      { target: { value: "provider-message-123" } }
    );

    acknowledgeEvidence();
    validate();

    expect(
      screen.getByRole("status").textContent
    ).toContain("Form validation passed");

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("clears validation when evidence changes", () => {
    renderForm();

    fillEvidence();
    acknowledgeEvidence();
    validate();

    expect(screen.getByRole("status")).toBeTruthy();

    fireEvent.change(
      screen.getByLabelText("Investigation notes"),
      { target: { value: "Updated investigation." } }
    );

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("clears validation when the outcome changes", () => {
    renderForm();

    fillEvidence();
    acknowledgeEvidence();
    validate();

    expect(screen.getByRole("status")).toBeTruthy();

    fireEvent.change(
      screen.getByLabelText("Provider evidence outcome"),
      { target: { value: "CONFLICTING" } }
    );

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("clears validation when acknowledgement is withdrawn", () => {
    renderForm();

    fillEvidence();
    acknowledgeEvidence();
    validate();

    expect(screen.getByRole("status")).toBeTruthy();

    fireEvent.click(screen.getByRole("checkbox"));

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("never submits an API request during form interaction", () => {
    renderForm();

    fireEvent.change(
      screen.getByLabelText("Provider evidence outcome"),
      { target: { value: "NOT_ACCEPTED" } }
    );

    fillEvidence();
    acknowledgeEvidence();
    validate();

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});