// C:\Users\Asiya\projects\dalra\app\brands\apply\BrandApplyForm.tsx
"use client";

import { useMemo, useState } from "react";
import countryCodes from "@/lib/country-codes.json";
import citiesByCountry from "@/lib/cities-by-country.json";
import { useRouter } from "next/navigation";
import worldCountries from "world-countries";

const PLATFORM_OPTIONS = ["SHOPIFY", "GODADDY", "WIX", "OTHER"] as const;
type PlatformHosted = (typeof PLATFORM_OPTIONS)[number];

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
  // Tell us about yourself
  firstName: string;
  lastName: string;
  email: string;

  phoneCountry: string;
  phoneNumber: string;

  // Tell us about what you do
  companyName: string;
  website: string;

  countryCode: string; // ISO-2
  cityChoice: string; // from dropdown
  cityOther: string; // typed if cityChoice === "Other"

  platformHosted: PlatformHosted;
  platformOtherText: string; // only if platformHosted === "OTHER"

  socialPlatform: SocialPlatform;
  socialHandle: string;

  // Help us connect you…
  notes: string;
};

function toStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

function humanPlatform(p: PlatformHosted) {
  if (p === "SHOPIFY") return "Shopify";
  if (p === "GODADDY") return "GoDaddy";
  if (p === "WIX") return "Wix";
  return "Other";
}

export default function BrandApplyForm() {
  const router = useRouter();

  const countryOptions = useMemo(() => {
    return worldCountries
      .map((c) => ({ code: c.cca2, name: c.name.common }))
      .filter((x) => x.code && x.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",

    phoneCountry: "+44",
    phoneNumber: "",

    companyName: "",
    website: "",

    // ✅ default country UK + default city London
    countryCode: "GB",
    cityChoice: "London",
    cityOther: "",

    // ✅ hosted dropdown
    platformHosted: "SHOPIFY",
    platformOtherText: "",

    socialPlatform: "none",
    socialHandle: "",

    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const isGB = String(form.countryCode || "").toUpperCase() === "GB";

  const cityDropdownOptions = useMemo(() => {
    const cc = String(form.countryCode || "").toUpperCase();
    const list = (citiesByCountry as any)?.[cc] as string[] | undefined;

    const base = Array.isArray(list) && list.length ? list.slice() : [];

    // ✅ Only force London for GB
    if (cc === "GB" && !base.includes("London")) base.unshift("London");

    // Ensure Other exists
    if (!base.includes("Other")) base.push("Other");

    // If we have nothing at all, ensure at least Other
    if (base.length === 0) base.push("Other");

    return base;
  }, [form.countryCode]);

  function onChangeCountry(code: string) {
    const cc = String(code || "").toUpperCase();
    const list = (citiesByCountry as any)?.[cc] as string[] | undefined;
    const base = Array.isArray(list) && list.length ? list.slice() : [];

    if (cc === "GB" && !base.includes("London")) base.unshift("London");
    if (!base.includes("Other")) base.push("Other");

    const defaultCity =
      cc === "GB" && base.includes("London") ? "London" : base[0] ?? "Other";

    setForm((prev) => ({
      ...prev,
      countryCode: cc,
      cityChoice: defaultCity,
      cityOther: "",
    }));
  }

  const resolvedCity = useMemo(() => {
    if (form.cityChoice === "Other") return toStr(form.cityOther);
    return toStr(form.cityChoice);
  }, [form.cityChoice, form.cityOther]);

  const showOtherPlatform = form.platformHosted === "OTHER";

  const canSubmit = useMemo(() => {
    const ok =
      toStr(form.firstName).length > 0 &&
      toStr(form.lastName).length > 0 &&
      toStr(form.email).includes("@") &&
      toStr(form.phoneNumber).length > 0 &&
      toStr(form.companyName).length > 0 &&
      toStr(form.website).length > 0 &&
      String(form.countryCode || "").trim().length === 2 &&
      resolvedCity.length > 0 &&
      form.socialPlatform !== "none" &&
      toStr(form.socialHandle).length > 0 &&
      toStr(form.notes).length > 0;

    if (!ok) return false;
    if (showOtherPlatform) return toStr(form.platformOtherText).length > 0;

    return true;
  }, [form, resolvedCity, showOtherPlatform]);

   function fieldError(condition: boolean) {
  if (!showErrors) return "";
  return condition ? "border-red-400 bg-red-50" : "";
}

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

  if (!canSubmit) {
    setShowErrors(true);
    setErr("Please complete all required fields before submitting.");
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

        phone,
        website: toStr(form.website),
        socialMedia,
        notes: toStr(form.notes),

        // ✅ location
        countryCode: String(form.countryCode || "").trim().toUpperCase(),
        city: resolvedCity,

        // ✅ new fields
        companyName: toStr(form.companyName),
        platformHosted: form.platformHosted,
        platformHostedOther: showOtherPlatform ? toStr(form.platformOtherText) : null,
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

  const inputClass = "mt-1 w-full rounded border border-[#d8c9b5] bg-white px-4 py-3 text-sm text-[#1a0a0e] placeholder:text-[#c0b0a0] outline-none focus:border-[#7B2D3E]";
  const selectClass = "mt-1 w-full rounded border border-[#d8c9b5] bg-white px-4 py-3 text-sm text-[#1a0a0e] outline-none focus:border-[#7B2D3E]";
  const labelClass = "text-[11px] uppercase tracking-[0.14em] text-[#6b5c4e]";
  const sectionTitle = "font-heading text-2xl text-[#1a0a0e] md:text-3xl";
  const sectionWrap = "rounded-2xl border border-[#e8ddd4] bg-white p-6 md:p-8";
  const errMsg = "mt-1 text-xs text-red-500"; // ← ADD HERE



  // IDs for accessibility linking
  const phoneLegendId = "phoneLegend";

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      {/* ------------------------------ */}
      {/* Tell us about yourself */}
      {/* ------------------------------ */}
      <section className={sectionWrap}>
        <h2 className={sectionTitle}>Tell us about yourself</h2>

        <div className="mt-6 space-y-6">
          {/* First / Last name */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="firstName" className={labelClass}>
                First name *
              </label>
              <input id="firstName" className={`${inputClass} ${fieldError(!form.firstName.trim())}`}
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
                disabled={submitting}
              />
              {showErrors && !form.firstName.trim() && (
  <p className={errMsg}>First name is required</p>
)}
              
            </div>

            

            <div>
              <label htmlFor="lastName" className={labelClass}>
                Last name *
              </label>
              <input id="lastName" className={`${inputClass} ${fieldError(!form.lastName.trim())}`}
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
                disabled={submitting}
              />
              {showErrors && !form.lastName.trim() && (
  <p className={errMsg}>Last name is required</p>
)}
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className={labelClass}>
              Business email *
            </label>
            <input id="email" className={`${inputClass} ${fieldError(!form.email.includes("@"))}`}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@company.com"
              required
              disabled={submitting}
              autoComplete="email"
            />
            {showErrors && !form.email.includes("@") && (
  <p className={errMsg}>A valid email address is required</p>
)}
          </div>

          {/* Phone */}
          <fieldset>
            <legend id={phoneLegendId} className="text-sm font-medium">
              Phone *
            </legend>

            <div className="mt-1 grid grid-cols-[220px_1fr] gap-3">
              <select
                id="phoneCountry"
                className="rounded-xl border border-black/15 bg-white px-3 py-2 text-black"
                value={form.phoneCountry}
                onChange={(e) => setForm({ ...form, phoneCountry: e.target.value })}
                aria-labelledby={phoneLegendId}
                title="Phone country code"
                disabled={submitting}
              >
                
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

              <input id="phoneNumber" className={`rounded-xl border border-black/15 bg-white px-3 py-2 text-black placeholder:text-black/40 ${fieldError(!form.phoneNumber.trim())}`}
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                placeholder="Phone number"
                inputMode="tel"
                pattern="^[0-9\\s()+-]{7,20}$"
                required
                disabled={submitting}
                autoComplete="tel"
              />
              {showErrors && !form.phoneNumber.trim() && (
  <p className={errMsg}>Phone number is required</p>
)}
            </div>
          </fieldset>
        </div>
      </section>

      {/* ------------------------------ */}
      {/* Tell us about what you do */}
      {/* ------------------------------ */}
      <section className={sectionWrap}>
        <h2 className={sectionTitle}>Tell us about what you do</h2>

        <div className="mt-6 space-y-6">
          {/* Company name */}
          <div>
            <label htmlFor="companyName" className={labelClass}>
              Company *
            </label>
            <input id="companyName" className={`${inputClass} ${fieldError(!form.companyName.trim())}`}
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              placeholder="Your brand name"
              required
              disabled={submitting}
              autoComplete="organization"
            />
            {showErrors && !form.companyName.trim() && (
  <p className={errMsg}>Company name is required</p>
)}
          </div>

          {/* Website */}
          <div>
            <label htmlFor="website" className={labelClass}>
              Company website *
            </label>
            <input id="website" className={`${inputClass} ${fieldError(!form.website.trim())}`}
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://example.com"
              required
              disabled={submitting}
              autoComplete="url"
            />
            {showErrors && !form.website.trim() && (
  <p className={errMsg}>Website is required</p>
)}
          </div>

          {/* Country + City */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="countryCode" className={labelClass}>
                Country or region *
              </label>
              <select id="countryCode" className={`${selectClass} ${fieldError(!form.countryCode.trim())}`} 
                value={form.countryCode}
                onChange={(e) => onChangeCountry(e.target.value)}
                required
                disabled={submitting}
              >
                {countryOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cityChoice" className={labelClass}>
                City *
              </label>
              <select
                id="cityChoice"
                className={selectClass}
                value={form.cityChoice}
                onChange={(e) => setForm({ ...form, cityChoice: e.target.value })}
                required
                disabled={submitting}
              >
                {cityDropdownOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {form.cityChoice === "Other" && (
                <input
                  className="mt-2 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-black placeholder:text-black/40"
                  value={form.cityOther}
                  onChange={(e) => setForm({ ...form, cityOther: e.target.value })}
                  placeholder="Type your city"
                  required
                  disabled={submitting}
                />
              )}

              {isGB && (
                <div className="mt-1 text-xs text-black/60">
                
                </div>
              )}
            </div>
          </div>

          {/* Hosted on */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="platformHosted" className={labelClass}>
                Where is your store hosted? *
              </label>
              <select id="platformHosted" className={selectClass}
                value={form.platformHosted}
                onChange={(e) => {
                  const v = e.target.value as PlatformHosted;
                  setForm((prev) => ({
                    ...prev,
                    platformHosted: v,
                    platformOtherText: v === "OTHER" ? prev.platformOtherText : "",
                  }));
                }}
                required
                disabled={submitting}
              >
                {PLATFORM_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {humanPlatform(p)}
                  </option>
                ))}
              </select>

              <div className="mt-1 text-xs text-black/60">
              </div>
            </div>

            {showOtherPlatform && (
              <div>
                <label htmlFor="platformOtherText" className={labelClass}>
                  Which platform? *
                </label>
                <input
                  id="platformOtherText"
                  className={inputClass}
                  value={form.platformOtherText}
                  onChange={(e) => setForm({ ...form, platformOtherText: e.target.value })}
                  placeholder="e.g. Squarespace, BigCommerce…"
                  required
                  disabled={submitting}
                />
              </div>
            )}
          </div>

          {/* Social */}
          <div>
            <label htmlFor="socialPlatform" className={labelClass}>
              Social media *
            </label>

            <div className="mt-1 grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
              <select
                id="socialPlatform"
                className="rounded-xl border border-black/15 bg-white px-3 py-2 text-black placeholder:text-black/40"
                value={form.socialPlatform}
                required
                disabled={submitting}
                title="Social media platform"
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

              <input id="socialHandle" className={`rounded-xl border px-3 py-2 ${fieldError(!form.socialHandle.trim())}`} 
                value={form.socialHandle}
                onChange={(e) => setForm({ ...form, socialHandle: e.target.value })}
                placeholder="Username or link"
                required
                disabled={submitting}
              />
              
            </div>
            {showErrors && form.socialPlatform === "none" && (
  <p className={errMsg}>Please select a social platform</p>
)}
{showErrors && form.socialPlatform !== "none" && !form.socialHandle.trim() && (
  <p className={errMsg}>Social handle or link is required</p>
)}
          </div>
        </div>
      </section>

      {/* ------------------------------ */}
      {/* Help us connect you… */}
      {/* ------------------------------ */}
      <section className={sectionWrap}>
        <h2 className={sectionTitle}>Help us connect you to the right person</h2>

        <div className="mt-6">
          <label htmlFor="notes" className={labelClass}>
            Please explain how we can assist you *
          </label>
          <textarea id="notes" className={`${inputClass} ${fieldError(!form.notes.trim())}`} 
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={7}
            required
            disabled={submitting}
          />
          {showErrors && !form.notes.trim() && (
  <p className={errMsg}>Please tell us how we can help</p>
)}
        </div>
      </section>

      {err && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
          aria-live="polite"
        >
          {err}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded bg-[#7B2D3E] px-4 py-4 text-sm tracking-wide text-white transition hover:bg-[#6a2535] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Submit application"}
      </button>
    </form>
  );
}


