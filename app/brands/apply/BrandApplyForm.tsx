"use client";

import { useMemo, useState } from "react";
import countryCodes from "@/lib/country-codes.json";
import { useRouter } from "next/navigation";

type SocialPlatform =
  | "none"
  | "instagram"
  | "tiktok"
  | "facebook"
  | "pinterest"
  | "youtube"
  | "x"
  | "linkedin";

const SOCIAL_OPTIONS: { label: string; value: SocialPlatform }[] = [
  { label: "None", value: "none" },
  { label: "Instagram", value: "instagram" },
  { label: "TikTok", value: "tiktok" },
  { label: "Facebook", value: "facebook" },
  { label: "Pinterest", value: "pinterest" },
  { label: "YouTube", value: "youtube" },
  { label: "X (Twitter)", value: "x" },
  { label: "LinkedIn", value: "linkedin" },
];

type FormState = {
  firstName: string;
  lastName: string;
  email: string;

  phoneCountry: string; // e.g. +44
  phoneNumber: string;  // local part

  website: string;
  notes: string;

  socialPlatform: SocialPlatform; // optional
  socialHandle: string;           // required only if platform != none
};

export default function BrandApplyForm() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    phoneCountry: "+44",
    phoneNumber: "",
    website: "",
    notes: "",
    socialPlatform: "none",
    socialHandle: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // All mandatory except social media
  const canSubmit = useMemo(() => {
    const requiredOk =
      form.firstName.trim().length > 0 &&
      form.lastName.trim().length > 0 &&
      form.email.trim().includes("@") &&
      form.website.trim().length > 0 &&
      form.notes.trim().length > 0 &&
      form.phoneNumber.trim().length > 0;

    const socialOk =
      form.socialPlatform === "none" || form.socialHandle.trim().length > 0;

    return requiredOk && socialOk;
  }, [form]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!canSubmit) {
      setErr("Please complete all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const phone = `${form.phoneCountry} ${form.phoneNumber}`.trim();

      // Keep API compatible: send one socialMedia string (no DB migration needed)
      const socialMedia =
        form.socialPlatform === "none"
          ? ""
          : `${form.socialPlatform}: ${form.socialHandle}`.trim();

      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone,
        website: form.website.trim(),
        socialMedia,
        notes: form.notes.trim(),
      };

      const r = await fetch("/api/brand-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Failed to submit.");

      // Redirect to success page (newsletter-style)
      router.push("/brands/apply/success");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "mt-1 w-full rounded-xl border px-3 py-2";
  const labelClass = "text-sm font-medium";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* First / Last name */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={labelClass}>
            First name *
          </label>
          <input
            id="firstName"
            className={inputClass}
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            required
          />
        </div>

        <div>
          <label htmlFor="lastName" className={labelClass}>
            Last name *
          </label>
          <input
            id="lastName"
            className={inputClass}
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            required
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className={labelClass}>
          Work email *
        </label>
        <input
          id="email"
          type="email"
          className={inputClass}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="name@company.com"
          required
        />
      </div>

      {/* Phone with country code */}
      <div>
        <label htmlFor="phoneCountry" className={labelClass}>
          Phone *
        </label>

        <div className="mt-1 grid grid-cols-[220px_1fr] gap-3">
          <select
            id="phoneCountry"
            className="rounded-xl border px-3 py-2"
            value={form.phoneCountry}
            onChange={(e) => setForm({ ...form, phoneCountry: e.target.value })}
          >
            {/* UK pinned */}
            <option value="+44">United Kingdom (+44)</option>
            <option disabled>──────────</option>

            {countryCodes
              .filter((c) => c.code !== "+44")
              .map((c) => (
                <option key={`${c.name}-${c.code}`} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
          </select>

          <input
            id="phoneNumber"
            className="rounded-xl border px-3 py-2"
            value={form.phoneNumber}
            onChange={(e) =>
              setForm({ ...form, phoneNumber: e.target.value })
            }
            placeholder="Phone number"
            inputMode="tel"
            // digits, spaces and common phone symbols only — blocks letters
            pattern="^[0-9\s()+-]{7,20}$"
            title="Please enter a valid phone number (digits only)."
            required
          />
        </div>
      </div>

      {/* Website (required) */}
      <div>
        <label htmlFor="website" className={labelClass}>
          Company website *
        </label>
        <input
          id="website"
          className={inputClass}
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          placeholder="https://example.com"
          required
        />
      </div>

      {/* Social (optional dropdown + handle) */}
      <div>
        <label htmlFor="socialPlatform" className={labelClass}>
  Social media (optional)
</label>


        <div className="mt-1 grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
          <select
            id="socialPlatform"
            className="rounded-xl border px-3 py-2"
            value={form.socialPlatform}
            onChange={(e) =>
              setForm({
                ...form,
                socialPlatform: e.target.value as SocialPlatform,
                // clear handle if turning off
                socialHandle:
                  e.target.value === "none" ? "" : form.socialHandle,
              })
            }
          >
            {SOCIAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <input
            id="socialHandle"
            className="rounded-xl border px-3 py-2"
            value={form.socialHandle}
            onChange={(e) =>
              setForm({ ...form, socialHandle: e.target.value })
            }
            placeholder="Username or link"
            disabled={form.socialPlatform === "none"}
            required={form.socialPlatform !== "none"}
          />
        </div>
      </div>

      {/* Notes (required) */}
      <div>
        <label htmlFor="notes" className={labelClass}>
          Anything else we should know? *
        </label>
        <textarea
          id="notes"
          className={inputClass}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={6}
          required
        />
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="w-full rounded-xl bg-black px-4 py-3 text-white disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Submit application"}
      </button>
    </form>
  );
}
