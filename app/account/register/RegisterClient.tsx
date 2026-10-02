"use client";

import { useState } from "react";
import AuthShell from "@/components/AuthShell";

export default function RegisterClient() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] =  useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    const passwordErrors: string[] = [];

if (password.length < 10) {
  passwordErrors.push(
    "Password must be at least 10 characters."
  );
}

if (!/[a-z]/.test(password)) {
  passwordErrors.push(
    "Password must include a lowercase letter."
  );
}

if (!/[A-Z]/.test(password)) {
  passwordErrors.push(
    "Password must include an uppercase letter."
  );
}

if (!/[0-9]/.test(password)) {
  passwordErrors.push(
    "Password must include a number."
  );
}

if (!/[^A-Za-z0-9]/.test(password)) {
  passwordErrors.push(
    "Password must include a symbol."
  );
}

if (passwordErrors.length > 0) {
  setErr(passwordErrors[0]);
  return;
}

    if (!dateOfBirth) {
  setErr("Please enter your date of birth.");
  return;
}

const dob =
  new Date(`${dateOfBirth}T00:00:00.000Z`);

if (
  Number.isNaN(
    dob.getTime()
  )
) {
  setErr(
    "Please enter a valid date of birth."
  );
  return;
}

const today =
  new Date();

let age =
  today.getUTCFullYear() -
  dob.getUTCFullYear();

const monthDifference =
  today.getUTCMonth() -
  dob.getUTCMonth();

if (
  monthDifference < 0 ||
  (
    monthDifference === 0 &&
    today.getUTCDate() <
      dob.getUTCDate()
  )
) {
  age -= 1;
}

if (age < 13) {
  setErr(
    "You must be at least 13 years old to create a Veilora account."
  );
  return;
}
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/account/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, firstName, lastName, dateOfBirth,}),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j?.error ?? `Registration failed (${r.status})`);
        return;
      }
      window.location.assign("/account/wishlist");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create your account."
      subtitle="Join Veilora Club to save favourites and track your style."
      variant="shopper"
    >
      <form onSubmit={onRegister} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-[0.14em] text-[#6b5c4e]">
              First name
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded border border-[#d8c9b5] bg-white px-4 py-3 text-sm text-[#1a0a0e] placeholder:text-[#c0b0a0] outline-none focus:border-[#7B2D3E]"
              placeholder="Doha"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.14em] text-[#6b5c4e]">
              Last name
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded border border-[#d8c9b5] bg-white px-4 py-3 text-sm text-[#1a0a0e] placeholder:text-[#c0b0a0] outline-none focus:border-[#7B2D3E]"
              placeholder="Nuur"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div>
  <label className="text-[11px] uppercase tracking-[0.14em] text-[#6b5c4e]">
    Date of birth
  </label>

  <input
    type="date"
    className="mt-1 w-full rounded border border-[#d8c9b5] bg-white px-4 py-3 text-sm text-[#1a0a0e] outline-none focus:border-[#7B2D3E]"
    value={dateOfBirth}
    onChange={(e) =>
      setDateOfBirth(
        e.target.value
      )
    }
    required
  />

  <p className="mt-1.5 text-[11px] text-[#a89280]">
    Used to personalise your Veilora experience and understand our audience.
  </p>
</div>

        <div>
          <label className="text-[11px] uppercase tracking-[0.14em] text-[#6b5c4e]">
            Email address
          </label>
          <input
            type="email"
            className="mt-1 w-full rounded border border-[#d8c9b5] bg-white px-4 py-3 text-sm text-[#1a0a0e] placeholder:text-[#c0b0a0] outline-none focus:border-[#7B2D3E]"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-[0.14em] text-[#6b5c4e]">
            Password
          </label>
          <input
            type="password"
            className="mt-1 w-full rounded border border-[#d8c9b5] bg-white px-4 py-3 text-sm text-[#1a0a0e] placeholder:text-[#c0b0a0] outline-none focus:border-[#7B2D3E]"
            placeholder="Create a secure password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={10}
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-[#a89280]">
  At least 10 characters, including an uppercase
  letter, lowercase letter, number and symbol.
</p>
        </div>

        <button
          type="submit"
          disabled={busy || !email || !password || !dateOfBirth}
          className="w-full rounded bg-[#7B2D3E] px-4 py-3.5 text-sm tracking-wide text-white transition hover:bg-[#6a2535] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Creating account..." : "Create account →"}
        </button>

        <div className="text-center text-xs">
          <a
            href="/account/login"
            className="text-[#a89280] underline underline-offset-4 hover:text-[#7B2D3E]"
          >
            Already have an account? Sign in
          </a>
        </div>

        {err && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-[#a89280]">
          By creating an account you agree to our{" "}
          <a href="/terms" className="underline underline-offset-4 hover:text-[#7B2D3E]">
            terms
          </a>{" "}
          and{" "}
          <a href="/privacy-policy" className="underline underline-offset-4 hover:text-[#7B2D3E]">
            privacy policy
          </a>.
        </p>
      </form>
    </AuthShell>
  );
}
