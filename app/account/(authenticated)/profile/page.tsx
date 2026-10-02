"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

type ShopperProfile = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  countryCode: string | null;
  dateOfBirth: string | null;
};
function formatDisplayName(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed !== trimmed.toUpperCase()) {
    return trimmed;
  }

  return trimmed
    .toLocaleLowerCase()
    .replace(/\b\p{L}/gu, (letter) =>
      letter.toLocaleUpperCase()
    );
}

export default function ProfilePage() {
  const [profile, setProfile] =
    useState<ShopperProfile | null>(null);

  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

const [changingPassword, setChangingPassword] =
  useState(false);

const [currentPassword, setCurrentPassword] =
  useState("");

const [newPassword, setNewPassword] =
  useState("");

const [confirmPassword, setConfirmPassword] =
  useState("");

const [passwordSaving, setPasswordSaving] =
  useState(false);

const [passwordMessage, setPasswordMessage] =
  useState<string | null>(null);

const [passwordError, setPasswordError] =
  useState<string | null>(null);

  const [changingEmail, setChangingEmail] =
  useState(false);

const [newEmail, setNewEmail] =
  useState("");

const [emailPassword, setEmailPassword] =
  useState("");

const [emailStep, setEmailStep] =
  useState<"REQUEST" | "VERIFY">("REQUEST");

const [verificationCode, setVerificationCode] =
  useState("");

const [pendingEmail, setPendingEmail] =
  useState("");

const [emailSaving, setEmailSaving] =
  useState(false);

const [emailMessage, setEmailMessage] =
  useState<string | null>(null);

const [emailError, setEmailError] =
  useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response =
          await fetch(
            "/api/account/profile",
            {
              credentials: "include",
            }
          );

        if (!response.ok) {
          setError(
            "We couldn't load your profile."
          );
          return;
        }

        const data =
          await response.json();

        setProfile(data.shopper);

        setFirstName(
          data.shopper.firstName ?? ""
        );

        setLastName(
          data.shopper.lastName ?? ""
        );
      } catch {
        setError(
          "We couldn't load your profile."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

async function changePassword(
  event: FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  setPasswordSaving(true);
  setPasswordMessage(null);
  setPasswordError(null);

  try {
    const response =
      await fetch(
        "/api/account/security/password",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      setPasswordError(
        data.error ??
          "We couldn't update your password."
      );
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setChangingPassword(false);

    setPasswordMessage(
      "Your password has been updated."
    );
  } catch {
    setPasswordError(
      "We couldn't update your password."
    );
  } finally {
    setPasswordSaving(false);
  }
}

async function requestEmailChange(
  event: FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  setEmailSaving(true);
  setEmailError(null);
  setEmailMessage(null);

  try {
    const response = await fetch(
      "/api/account/security/email/request",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          newEmail,
          currentPassword:
            emailPassword,
        }),
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      setEmailError(
        data.error ??
          "We couldn't send the verification code."
      );
      return;
    }

    setPendingEmail(data.newEmail);
    setEmailStep("VERIFY");

    /*
     * We no longer need the password in
     * browser state after re-authentication.
     */
    setEmailPassword("");

    setEmailMessage(
      `We sent a 6-digit verification code to ${data.newEmail}.`
    );
  } catch {
    setEmailError(
      "We couldn't send the verification code."
    );
  } finally {
    setEmailSaving(false);
  }
}

async function verifyEmailChange(
  event: FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  setEmailSaving(true);
  setEmailError(null);
  setEmailMessage(null);

  try {
    const response = await fetch(
      "/api/account/security/email/verify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          code: verificationCode,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setEmailError(
        data.error ??
          "We couldn't verify this code."
      );
      return;
    }

    /*
     * Update the Profile page immediately
     * without requiring a reload.
     */
    setProfile((current) =>
      current
        ? {
            ...current,
            email: data.email,
          }
        : current
    );

    setChangingEmail(false);
    setEmailStep("REQUEST");
    setNewEmail("");
    setPendingEmail("");
    setVerificationCode("");
    setEmailPassword("");

    setEmailMessage(
      "Your email address has been updated."
    );
  } catch {
    setEmailError(
      "We couldn't verify this code."
    );
  } finally {
    setEmailSaving(false);
  }
}

  async function saveProfile(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/account/profile",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              firstName,
              lastName,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ??
            "We couldn't save your profile."
        );
        return;
      }

      setProfile(data.shopper);

      setFirstName(
        data.shopper.firstName ?? ""
      );

      setLastName(
        data.shopper.lastName ?? ""
      );

      setMessage(
        "Your profile has been updated."
      );
    } catch {
      setError(
        "We couldn't save your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-sm tracking-wide text-[#a89280]">
        Loading your profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-[#e8ddd4] bg-white p-8">
        <p className="text-sm text-[#7B2D3E]">
          {error ??
            "We couldn't load your profile."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-10">
        {/* Personal details */}
        <section>
          <div className="border-b border-[#ded1c7] pb-6">
  <h2 className="mt-2 font-heading text-3xl text-[#1a0a0e]">
    Personal details
  </h2>

  <p className="mt-2 max-w-xl text-sm leading-6 text-[#8b7768]">
    Manage the personal information associated with
    your Veilora account.
  </p>
</div>

          <form
            onSubmit={saveProfile}
            className="mt-6"
          >
            <div className="grid gap-6 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#6b5c4e]">
                  First name
                </span>

                <input
                  type="text"
                  value={
  firstName
    ? firstName.charAt(0).toUpperCase() +
      firstName.slice(1).toLowerCase()
    : ""
}
                  onChange={(event) =>
                    setFirstName(
                      event.target.value
                    )
                  }
                  maxLength={100}
                  className="mt-2 w-full border-0 border-b border-[#d8c9b5] bg-transparent px-0 py-3 text-base text-[#1a0a0e] outline-none transition focus:border-[#7B2D3E]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#6b5c4e]">
                  Last name
                </span>

                <input
                  type="text"
                  value={
  lastName
    ? lastName.charAt(0).toUpperCase() +
      lastName.slice(1).toLowerCase()
    : ""
}
                  onChange={(event) =>
                    setLastName(
                      event.target.value
                    )
                  }
                  maxLength={100}
                  className="mt-2 w-full border-0 border-b border-[#d8c9b5] bg-transparent px-0 py-3 text-base text-[#1a0a0e] outline-none transition focus:border-[#7B2D3E]"
                />
              </label>
            </div>

            {profile.dateOfBirth && (
  <div className="mt-8 grid gap-6 md:grid-cols-2">
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#6b5c4e]">
        Date of birth
      </p>

      <div className="border-b border-[#d8c9b5] py-3">
        <p className="text-base text-[#1a0a0e]">
          {new Intl.DateTimeFormat(
            "en-GB",
            {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            }
          ).format(
            new Date(
              `${profile.dateOfBirth}T00:00:00Z`
            )
          )}
        </p>
      </div>
    </div>
  </div>
)}

            {message && (
              <p className="mt-6 text-sm text-[#4f6b57]">
                {message}
              </p>
            )}

            {error && (
              <p className="mt-6 text-sm text-[#7B2D3E]">
                {error}
              </p>
            )}

            <div className="mt-8">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#7B2D3E] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#682536] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save changes"}
              </button>
            </div>
          </form>
        </section>

        {/* Email */}
<section>
  <div className="border-b border-[#ded1c7] pb-6">
  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7B2D3E]">
    Sign-in details
  </p>

  <h2 className="mt-2 font-heading text-2xl text-[#1a0a0e]">
    Email
  </h2>

  <p className="mt-2 max-w-xl text-sm leading-6 text-[#8b7768]">
    Manage the email address you use to sign in
    to Veilora Club.
  </p>
</div>

  {!changingEmail ? (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#6b5c4e]">
          Email address
        </p>

        {emailMessage && (
  <p className="mt-2 text-sm text-[#4f6b57]">
    {emailMessage}
  </p>
)}

        <p className="mt-2 text-sm text-[#1a0a0e]">
          {profile.email}
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          setChangingEmail(true);
          setEmailStep("REQUEST");
          setNewEmail("");
          setPendingEmail("");
          setVerificationCode("");
          setEmailPassword("");
          setEmailError(null);
          setEmailMessage(null);
        }}
        className="text-sm text-[#7B2D3E] transition hover:opacity-60"
      >
        Change email →
      </button>
    </div>
  ) : emailStep === "REQUEST" ? (
    <form
      onSubmit={requestEmailChange}
      className="mt-6 max-w-xl"
    >
      <div className="space-y-6">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#6b5c4e]">
            New email address
          </span>

          <input
            type="email"
            autoComplete="email"
            value={newEmail}
            onChange={(event) =>
              setNewEmail(
                event.target.value
              )
            }
            required
            className="mt-2 w-full border-0 border-b border-[#d8c9b5] bg-transparent px-0 py-3 text-base text-[#1a0a0e] outline-none transition focus:border-[#7B2D3E]"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#6b5c4e]">
            Current password
          </span>

          <input
            type="password"
            autoComplete="current-password"
            value={emailPassword}
            onChange={(event) =>
              setEmailPassword(
                event.target.value
              )
            }
            required
            className="mt-2 w-full border-0 border-b border-[#d8c9b5] bg-transparent px-0 py-3 text-base text-[#1a0a0e] outline-none transition focus:border-[#7B2D3E]"
          />

          <p className="mt-2 text-xs text-[#a89280]">
            For your security, confirm your
            password before changing your
            sign-in email.
          </p>
        </label>
      </div>

      {emailError && (
        <p className="mt-5 text-sm text-[#7B2D3E]">
          {emailError}
        </p>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={emailSaving}
          className="rounded-full bg-[#7B2D3E] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#682536] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {emailSaving
            ? "Sending..."
            : "Send verification code"}
        </button>

        <button
          type="button"
          disabled={emailSaving}
          onClick={() => {
            setChangingEmail(false);
            setNewEmail("");
            setEmailPassword("");
            setEmailError(null);
            setEmailMessage(null);
          }}
          className="text-sm text-[#8b7768] transition hover:text-[#7B2D3E]"
        >
          Cancel
        </button>
      </div>
    </form>
  ) : (
    <form
  onSubmit={verifyEmailChange}
  className="mt-6 max-w-xl"
>
  <p className="text-sm leading-6 text-[#6b5c4e]">
    We sent a 6-digit verification code to{" "}
    <span className="font-medium text-[#1a0a0e]">
      {pendingEmail}
    </span>
    .
  </p>

  <label className="mt-6 block">
    <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#6b5c4e]">
      Verification code
    </span>

    <input
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      value={verificationCode}
      onChange={(event) => {
        const value =
          event.target.value
            .replace(/\D/g, "")
            .slice(0, 6);

        setVerificationCode(value);
      }}
      maxLength={6}
      required
      className="mt-3 w-full max-w-[240px] border-0 border-b border-[#d8c9b5] bg-transparent px-0 py-3 text-2xl tracking-[0.3em] text-[#1a0a0e] outline-none transition focus:border-[#7B2D3E]"
    />
  </label>

  <p className="mt-3 text-xs text-[#a89280]">
    The code expires after 15 minutes.
  </p>

  {emailError && (
    <p className="mt-5 text-sm text-[#7B2D3E]">
      {emailError}
    </p>
  )}

  <div className="mt-7 flex flex-wrap items-center gap-4">
    <button
      type="submit"
      disabled={
        emailSaving ||
        verificationCode.length !== 6
      }
      className="rounded-full bg-[#7B2D3E] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#682536] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {emailSaving
        ? "Verifying..."
        : "Verify email"}
    </button>

    <button
      type="button"
      disabled={emailSaving}
      onClick={() => {
        setChangingEmail(false);
        setEmailStep("REQUEST");
        setNewEmail("");
        setPendingEmail("");
        setVerificationCode("");
        setEmailPassword("");
        setEmailError(null);
        setEmailMessage(null);
      }}
      className="text-sm text-[#8b7768] transition hover:text-[#7B2D3E]"
    >
      Cancel
    </button>
  </div>
</form>
  )}
</section>

        {/* Password */}
<section>
  <div className="border-b border-[#ded1c7] pb-6">
  <p className="text-[11px] uppercase tracking-[0.22em] text-[#7B2D3E]">
    Account security
  </p>

  <h2 className="mt-2 font-heading text-2xl text-[#1a0a0e]">
    Password & security
  </h2>

  <p className="mt-2 max-w-xl text-sm leading-6 text-[#8b7768]">
    Keep your password secure and your account
    details up to date.
  </p>
</div>

  {!changingPassword ? (
    <div className="mt-6">
     <div className="flex items-end justify-between gap-6">
  <div className="w-full max-w-sm">
    <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#6b5c4e]">
      Password
    </p>

    <div className="border-b border-[#d8c9b5] py-3">
      <p className="text-sm tracking-[0.2em] text-[#1a0a0e]">
        ••••••••••••
      </p>
    </div>
  </div>

  <button
  type="button"
  onClick={() => {
    setChangingPassword(true);
    setPasswordMessage(null);
    setPasswordError(null);
  }}
  className="shrink-0 pb-3 text-sm text-[#8f2d45] transition hover:opacity-70"
>
  Change password →
</button>
</div>

      {passwordMessage && (
        <p className="mt-5 text-sm text-[#4f6b57]">
          {passwordMessage}
        </p>
      )}
    </div>
  ) : (
    <form
      onSubmit={changePassword}
      className="mt-6 max-w-xl"
    >
      <div className="space-y-6">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#6b5c4e]">
            Current password
          </span>

          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) =>
              setCurrentPassword(
                event.target.value
              )
            }
            className="mt-2 w-full border-0 border-b border-[#d8c9b5] bg-transparent px-0 py-3 text-base text-[#1a0a0e] outline-none transition focus:border-[#7B2D3E]"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#6b5c4e]">
            New password
          </span>

          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) =>
              setNewPassword(
                event.target.value
              )
            }
            minLength={10}
            className="mt-2 w-full border-0 border-b border-[#d8c9b5] bg-transparent px-0 py-3 text-base text-[#1a0a0e] outline-none transition focus:border-[#7B2D3E]"
          />

          <p className="mt-2 text-xs text-[#a89280]">
            At least 10 characters, including an uppercase
            letter, lowercase letter, number and symbol.
          </p>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#6b5c4e]">
            Confirm new password
          </span>

          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(
                event.target.value
              )
            }
            minLength={8}
            className="mt-2 w-full border-0 border-b border-[#d8c9b5] bg-transparent px-0 py-3 text-base text-[#1a0a0e] outline-none transition focus:border-[#7B2D3E]"
          />
        </label>
      </div>

      {passwordError && (
        <p className="mt-5 text-sm text-[#7B2D3E]">
          {passwordError}
        </p>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={passwordSaving}
          className="rounded-full bg-[#7B2D3E] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#682536] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {passwordSaving
            ? "Updating..."
            : "Update password"}
        </button>

        <button
          type="button"
          disabled={passwordSaving}
          onClick={() => {
            setChangingPassword(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setPasswordError(null);
          }}
          className="text-sm text-[#8b7768] transition hover:text-[#7B2D3E]"
        >
          Cancel
        </button>
      </div>
    </form>
  )}
</section>
      </div>
    </div>
  );
}