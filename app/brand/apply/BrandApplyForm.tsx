"use client";

import { useMemo, useState } from "react";

const PRODUCT_TYPE_OPTIONS = [
  "Abayas / Jilbabs",
  "Dresses",
  "Skirts",
  "Tops",
  "Sets",
  "Outerwear",
  "Swimwear",
  "Activewear",
  "Accessories",
  "Other",
];

type FormState = {
  brandName: string;
  website: string;
  email: string;
  productTypes: string[];
  notes: string;
};

export default function BrandApplyForm() {
  const [form, setForm] = useState<FormState>({
    brandName: "",
    website: "",
    email: "",
    productTypes: [],
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      form.brandName.trim().length >= 2 &&
      form.email.trim().includes("@") &&
      form.productTypes.length >= 1
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
      if (!r.ok) throw new Error(j?.error || "Failed to submit application.");

      setOk("Thanks — your application has been sent. We’ll be in touch soon.");
      setForm({ brandName: "", website: "", email: "", productTypes: [], notes: "" });
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleType(t: string) {
    setForm((p) => {
      const exists = p.productTypes.includes(t);
      return { ...p, productTypes: exists ? p.productTypes.filter(x => x !== t) : [...p.productTypes, t] };
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="text-sm font-medium">Brand name *</label>
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={form.brandName}
          onChange={(e) => setForm({ ...form, brandName: e.target.value })}
          placeholder="e.g. Noor Studio"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Website or Instagram</label>
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          placeholder="https://… or https://instagram.com/…"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Email *</label>
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="brand@email.com"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Product types *</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRODUCT_TYPE_OPTIONS.map((t) => {
            const active = form.productTypes.includes(t);
            return (
              <button
                type="button"
                key={t}
                onClick={() => toggleType(t)}
                className={[
                  "rounded-full border px-3 py-1.5 text-sm transition",
                  active ? "bg-black text-white" : "bg-white hover:bg-neutral-50",
                ].join(" ")}
              >
                {t}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Select at least one.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">Notes</label>
        <textarea
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Anything you'd like us to know (price range, best-sellers, countries you ship to, etc.)"
          rows={5}
        />
      </div>

      {err && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      {ok && <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{ok}</div>}

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
