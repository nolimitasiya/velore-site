// C:\Users\Asiya\projects\dalra\app\brands\apply\BrandApplyForm.tsx
"use client";

import { useMemo, useState } from "react";
import countryCodes from "@/lib/country-codes.json";
import citiesByCountry from "@/lib/cities-by-country.json";
import { useRouter } from "next/navigation";
import countries from "world-countries";

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
  { label: "Select a platform…", value: "none" },
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

  // ✅ brand location
  countryCode: string; // ISO-2 e.g. "GB"
  cityChoice: string; // from dropdown
  cityOther: string; // typed if cityChoice === "Other"

  // phone
  phoneCountry: string; // e.g. +44
  phoneNumber: string; // local part

  website: string;
  notes: string;

  socialPlatform: SocialPlatform;
  socialHandle: string;
};

function toStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

export default function BrandApplyForm() {
  const router = useRouter();

  const countryOptions = useMemo(() => {
    return countries
      .map((c) => ({ code: c.cca2, name: c.name.common }))
      .filter((x) => x.code && x.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",

    countryCode: "GB",
    cityChoice: "Other",
    cityOther: "",

    phoneCountry: "+44",
    phoneNumber: "",
    website: "",
    notes: "",
    socialPlatform: "none",
    socialHandle: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cityDropdownOptions = useMemo(() => {
    const cc = String(form.countryCode || "").toUpperCase();
    const list = (citiesByCountry as any)?.[cc] as string[] | undefined;
    const safe = Array.isArray(list) && list.length ? list : ["Other"];
    // ensure Other exists
    return safe.includes("Other") ? safe : [...safe, "Other"];
  }, [form.countryCode]);

  function onChangeCountry(code: string) {
    const cc = String(code || "").toUpperCase();
    const list = (citiesByCountry as any)?.[cc] as string[] | undefined;
    const opts = Array.isArray(list) && list.length ? list : ["Other"];
    const first = opts[0] ?? "Other";

    setForm((prev) => ({
      ...prev,
      countryCode: cc,
      cityChoice: first,
      cityOther: "",
    }));
  }

  const resolvedCity = useMemo(() => {
    if (form.cityChoice === "Other") return toStr(form.cityOther);
    return toStr(form.cityChoice);
  }, [form.cityChoice, form.cityOther]);

  const canSubmit = useMemo(() => {
    return (
      toStr(form.firstName).length > 0 &&
      toStr(form.lastName).length > 0 &&
      toStr(form.email).includes("@") &&
      toStr(form.website).length > 0 &&
      toStr(form.notes).length > 0 &&
      toStr(form.phoneNumber).length > 0 &&
      form.socialPlatform !== "none" &&
      toStr(form.socialHandle).length > 0 &&
      String(form.countryCode || "").trim().length === 2 &&
      resolvedCity.length > 0
    );
  }, [form, resolvedCity]);

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
      const socialMedia =
        form.socialPlatform === "none"
          ? ""
          : `${form.socialPlatform}: ${form.socialHandle}`.trim();

      const payload = {
        firstName: toStr(form.firstName),
        lastName: toStr(form.lastName),
        email: toStr(form.email),

        countryCode: String(form.countryCode || "").trim().toUpperCase(),
        city: resolvedCity,

        phone,
        website: toStr(form.website),
        socialMedia,
        notes: toStr(form.notes),
      };

      const r = await fetch("/api/brand-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Failed to submit.");

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

      {/* ✅ Country + City */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="countryCode" className={labelClass}>
            Country *
          </label>
          <select
            id="countryCode"
            className="mt-1 w-full rounded-xl border px-3 py-2 bg-white"
            value={form.countryCode}
            onChange={(e) => onChangeCountry(e.target.value)}
            required
          >
            {countryOptions.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
          <div className="mt-1 text-xs text-black/60">Where your brand is based.</div>
        </div>

        <div>
          <label htmlFor="cityChoice" className={labelClass}>
            City *
          </label>
          <select
            id="cityChoice"
            className="mt-1 w-full rounded-xl border px-3 py-2 bg-white"
            value={form.cityChoice}
            onChange={(e) => setForm({ ...form, cityChoice: e.target.value })}
            required
          >
            {cityDropdownOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {form.cityChoice === "Other" && (
            <input
              className="mt-2 w-full rounded-xl border px-3 py-2"
              value={form.cityOther}
              onChange={(e) => setForm({ ...form, cityOther: e.target.value })}
              placeholder="Type your city"
              required
            />
          )}
        </div>
      </div>

      {/* Phone with country code */}
      <div>
        <label htmlFor="phoneCountry" className={labelClass}>
          Phone *
        </label>

        <div className="mt-1 grid grid-cols-[220px_1fr] gap-3">
          <select
            id="phoneCountry"
            className="rounded-xl border px-3 py-2 bg-white"
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
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            placeholder="Phone number"
            inputMode="tel"
            pattern="^[0-9\s()+-]{7,20}$"
            title="Please enter a valid phone number (digits only)."
            required
          />
        </div>
      </div>

      {/* Website */}
      <div>
        <label htmlFor="website" className={labelClass}>
          Company website *
        </label>
        <input
          id="website"
          type="url"
          className={inputClass}
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          placeholder="https://example.com"
          required
        />
      </div>

      {/* Social */}
      <div>
        <label htmlFor="socialPlatform" className={labelClass}>
          Social media *
        </label>

        <div className="mt-1 grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
          <select
            id="socialPlatform"
            className="rounded-xl border px-3 py-2 bg-white"
            value={form.socialPlatform}
            required
            onChange={(e) =>
              setForm({
                ...form,
                socialPlatform: e.target.value as SocialPlatform,
              })
            }
          >
            <option value="none" disabled>
              Select a platform…
            </option>
            {SOCIAL_OPTIONS.filter((o) => o.value !== "none").map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <input
            id="socialHandle"
            className="rounded-xl border px-3 py-2"
            value={form.socialHandle}
            onChange={(e) => setForm({ ...form, socialHandle: e.target.value })}
            placeholder="Username or link"
            required
          />
        </div>
      </div>

      {/* Notes */}
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
