"use client";

import { useEffect, useRef, useState } from "react";

type MarketingPreferencesResponse = {
  marketingConsent: boolean;
  eligibleToOptIn: boolean;
};

function isMarketingPreferencesResponse(
  value: unknown
): value is MarketingPreferencesResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    typeof data.marketingConsent === "boolean" &&
    typeof data.eligibleToOptIn === "boolean"
  );
}

export default function MarketingPreferences() {
  const [preferences, setPreferences] =
    useState<MarketingPreferencesResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [uncertainSave, setUncertainSave] =
    useState(false);

  const savingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPreferences() {
      try {
        const response = await fetch(
          "/api/account/marketing-preferences",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("LOAD_FAILED");
        }

        const data: unknown = await response.json();

        if (!isMarketingPreferencesResponse(data)) {
          throw new Error("INVALID_RESPONSE");
        }

        if (!controller.signal.aborted) {
          setPreferences(data);
          setError(null);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError(
            "We couldn't load your marketing preferences. Please refresh the page."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadPreferences();

    return () => controller.abort();
  }, []);

  async function updateConsent(requestedConsent: boolean) {
    if (
      savingRef.current ||
      uncertainSave ||
      !preferences ||
      (requestedConsent && !preferences.eligibleToOptIn)
    ) {
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        "/api/account/marketing-preferences",
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            marketingConsent: requestedConsent,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("CONFLICT");
        }

        throw new Error("SAVE_FAILED");
      }

      const data: unknown = await response.json();

      if (
        !data ||
        typeof data !== "object" ||
        (data as Record<string, unknown>).ok !== true ||
        typeof (data as Record<string, unknown>)
          .marketingConsent !== "boolean"
      ) {
        throw new Error("INVALID_RESPONSE");
      }

      const confirmedConsent = (
        data as { marketingConsent: boolean }
      ).marketingConsent;

      if (confirmedConsent !== requestedConsent) {
        throw new Error("UNEXPECTED_RESPONSE");
      }

      setPreferences((current) =>
        current
          ? {
              ...current,
              marketingConsent: confirmedConsent,
            }
          : current
      );

      setMessage(
        confirmedConsent
          ? "Your marketing preferences have been saved. You've opted in to Veilora Club marketing updates."
          : "Your marketing preferences have been saved. You've opted out of Veilora Club marketing updates."
      );
    } catch (saveError) {
      setUncertainSave(true);

      if (
        saveError instanceof Error &&
        saveError.message === "CONFLICT"
      ) {
        setError(
          "Your preference couldn't be saved because another update was in progress. Please refresh your preferences before trying again."
        );
      } else {
        setError(
          "We couldn't confirm your preference was saved. Please refresh your preferences before trying again."
        );
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const consentEnabled =
    preferences?.marketingConsent === true;

  const canOptIn =
    preferences?.eligibleToOptIn === true;

  return (
    <section aria-labelledby="marketing-preferences-heading">
      <div className="border-b border-[#ded1c7] pb-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#7B2D3E]">
          Your preferences
        </p>

        <h2
          id="marketing-preferences-heading"
          className="mt-2 font-heading text-2xl text-[#1a0a0e]"
        >
          Marketing preferences
        </h2>

        <p className="mt-2 max-w-xl text-sm leading-6 text-[#8b7768]">
          Choose whether you'd like to receive updates
          from Veilora Club, including new brands,
          curated collections and exclusive discoveries.
          You can withdraw your consent at any time.
        </p>
      </div>

      <div className="mt-6 max-w-xl">
        {loading ? (
          <p className="text-sm text-[#8b7768]">
            Loading marketing preferences...
          </p>
        ) : preferences ? (
          <>
            <label className="flex cursor-pointer items-start justify-between gap-6">
              <span className="max-w-md">
                <span className="block text-sm font-medium text-[#1a0a0e]">
                  Marketing updates
                </span>

                <span className="mt-2 block text-sm leading-6 text-[#8b7768]">
                  Receive occasional emails about
                  collections, brands and discoveries
                  from Veilora Club.
                </span>
              </span>

              <input
                type="checkbox"
                checked={consentEnabled}
                disabled={
                  saving ||
                  uncertainSave ||
                  (!canOptIn && !consentEnabled)
                }
                onChange={(event) => {
                  void updateConsent(event.target.checked);
                }}
                aria-describedby="marketing-preferences-note"
                className="mt-1 h-5 w-5 shrink-0 accent-[#7B2D3E] disabled:cursor-not-allowed"
              />
            </label>

            <p
              id="marketing-preferences-note"
              className="mt-4 text-xs leading-5 text-[#8b7768]"
            >
              {canOptIn
                ? "Marketing emails are optional. Your account and essential service emails are not affected."
                : "Marketing updates are available to shoppers aged 18 or over."}
            </p>

            {saving && (
              <p
                role="status"
                className="mt-4 text-sm text-[#8b7768]"
              >
                Saving your preference...
              </p>
            )}
          </>
        ) : null}

        {message && (
          <p
            role="status"
            className="mt-4 text-sm text-[#4f6b57]"
          >
            {message}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 text-sm text-[#7B2D3E]"
          >
            {error}
          </p>
        )}
      </div>
    </section>
  );
}