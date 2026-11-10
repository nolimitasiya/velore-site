"use client";

import { useEffect, useState } from "react";
import AuthShell from "@/components/AuthShell";

type ApiResponse = {
  ok?: boolean;
  verified?: boolean;
  alreadyVerified?: boolean;
  error?: string;
  remainingAttempts?: number;
  retryAfterSeconds?: number;
};

export default function VerifyEmailClient() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setCooldown((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function onVerify(event: React.FormEvent) {
    event.preventDefault();

    if (!/^\d{6}$/.test(code) || busy || verified) {
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/account/auth/verify-email",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ code }),
        }
      );

      const result: ApiResponse = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          setError(
            "Your session has expired. Please sign in again."
          );
          return;
        }

        const attempts =
          typeof result.remainingAttempts === "number"
            ? ` ${result.remainingAttempts} attempts remaining.`
            : "";

        setError(
          (result.error ?? "Verification failed.") + attempts
        );

        return;
      }

      if (result.verified || result.alreadyVerified) {
        setVerified(true);
        setMessage("Your email has been verified successfully.");
      } else {
        setError("We couldn't confirm verification. Please try again.");
      }
    } catch {
      setError(
        "Unable to connect. Please check your connection and try again."
      );
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    if (resending || cooldown > 0 || verified) {
      return;
    }

    setResending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/account/auth/resend-verification",
        {
          method: "POST",
          credentials: "include",
        }
      );

      const result: ApiResponse = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        if (
          response.status === 429 &&
          typeof result.retryAfterSeconds === "number"
        ) {
          setCooldown(result.retryAfterSeconds);
        }

        setError(
          result.error ?? "Unable to resend your code."
        );

        return;
      }

      if (result.alreadyVerified) {
        setVerified(true);
        setMessage("Your email is already verified.");
        return;
      }

      setCode("");
      setCooldown(60);
      setMessage("A new verification code has been sent.");
    } catch {
      setError(
        "Unable to connect. Please try again."
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthShell
      title={verified ? "Email verified." : "Verify your email."}
      subtitle={
        verified
          ? "You're all set to explore Veilora Club."
          : "We've sent a six-digit verification code to your email address. Enter it below to confirm your account."
      }
      variant="shopper"
    >
      {verified ? (
        <div className="space-y-5">
          <div
            role="status"
            className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            {message}
          </div>

          <a
            href="/account/wishlist"
            className="block w-full rounded bg-[#7B2D3E] px-4 py-3.5 text-center text-sm tracking-wide text-white transition hover:bg-[#6a2535]"
          >
            Continue to my account
          </a>
        </div>
      ) : (
        <form onSubmit={onVerify} className="space-y-5">
          <div>
            <label
              htmlFor="verification-code"
              className="text-[11px] uppercase tracking-[0.14em] text-[#6b5c4e]"
            >
              Verification code
            </label>

            <input
              id="verification-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(event) => {
                setCode(
                  event.target.value.replace(/\D/g, "").slice(0, 6)
                );
                setError(null);
              }}
              placeholder="000000"
              className="mt-2 w-full rounded border border-[#d8c9b5] bg-white px-4 py-4 text-center text-2xl tracking-[0.35em] text-[#1a0a0e] outline-none focus:border-[#7B2D3E]"
            />

            <p className="mt-2 text-xs text-[#a89280]">
              Your code expires after 15 minutes.
            </p>
          </div>

          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="w-full rounded bg-[#7B2D3E] px-4 py-3.5 text-sm tracking-wide text-white transition hover:bg-[#6a2535] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Verifying..." : "Verify email"}
          </button>

          <div className="text-center text-xs text-[#6b5c4e]">
            Didn't receive your code?{" "}
            <button
              type="button"
              onClick={onResend}
              disabled={resending || cooldown > 0}
              className="font-medium text-[#7B2D3E] underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resending
                ? "Sending..."
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : "Resend code"}
            </button>
          </div>

          {message && (
            <div
              role="status"
              className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
            >
              {message}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="text-center text-xs">
            <a
              href="/account/login"
              className="text-[#a89280] underline underline-offset-4 hover:text-[#7B2D3E]"
            >
              Back to sign in
            </a>
          </div>
        </form>
      )}
    </AuthShell>
  );
}