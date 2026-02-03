"use client";

import { useMemo, useState } from "react";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  website: string;
  socialMedia: string;
  notes: string;
};

export default function BrandApplyForm() {
  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    website: "",
    socialMedia: "",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      form.firstName.trim().length >= 1 &&
      form.lastName.trim().length >= 1 &&
      form.email.trim().includes("@")
    );
  }, [form]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!canSubmit) {
      setErr("Please complete the required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch("/api/brand-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Failed to submit.");

      setOk("Thanks — we’ve received your details and will get back to you soon.");
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        website: "",
        socialMedia: "",
        notes: "",
      });
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
      {/* First + Last name row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="firstName">
            First name *
          </label>
          <input
            id="firstName"
            className={inputClass}
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            placeholder="Aisha"
            autoComplete="given-name"
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="lastName">
            Last name *
          </label>
          <input
            id="lastName"
            className={inputClass}
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            placeholder="Khan"
            autoComplete="family-name"
            required
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="email">
          Email *
        </label>
        <input
          id="email"
          className={inputClass}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="name@company.com"
          autoComplete="email"
          required
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="phone">
          Phone
        </label>
        <input
          id="phone"
          className={inputClass}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+44 7..."
          autoComplete="tel"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="website">
          Company website
        </label>
        <input
          id="website"
          className={inputClass}
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          placeholder="https://yourbrand.com"
          autoComplete="url"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="socialMedia">
          Social media
        </label>
        <input
          id="socialMedia"
          className={inputClass}
          value={form.socialMedia}
          onChange={(e) => setForm({ ...form, socialMedia: e.target.value })}
          placeholder="instagram.com/yourbrand"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="notes">
          Anything else we should know?
        </label>
        <textarea
          id="notes"
          className={inputClass}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Tell us about your brand, shipping countries, price range, best sellers…"
          rows={6}
        />
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}
      {ok && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {ok}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="w-full rounded-xl bg-black px-4 py-3 text-white disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Request Demo"}
      </button>
    </form>
  );
}
