"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PlatformHosted = "SHOPIFY" | "GODADDY" | "WIX" | "OTHER";

type ApplicationSource =
  | "MANUAL"
  | "INSTAGRAM_OUTREACH"
  | "EMAIL_OUTREACH"
  | "REFERRAL"
  | "OTHER";

export default function AddBrandButton() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyName: "",
    website: "",
    socialMedia: "",
    countryCode: "",
    city: "",
    platformHosted: "SHOPIFY" as PlatformHosted,
    platformHostedOther: "",
    applicationSource: "MANUAL" as ApplicationSource,
    notes: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);

    try {
      const r = await fetch("/api/admin/brand-applications/create-manual", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });

      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        setErr(j?.error ?? "Failed to create brand application");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create brand application");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#7B2D3E] shadow-sm transition hover:bg-white/90"
      >
        + Add Brand
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-[#FAF7F2] p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]">
                  Manual application
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-black">
                  Add Brand
                </h2>
                <p className="mt-1 text-sm text-black/60">
                  Create an application on behalf of a brand you sourced.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm text-black/60 hover:text-black"
              >
                Close
              </button>
            </div>

            <form onSubmit={submit} className="space-y-5">
              <div className="rounded-3xl border border-black/10 bg-white p-5">
                <h3 className="font-semibold text-black">Contact details</h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <input
                    required
                    placeholder="First name"
                    value={form.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                    className="rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]"
                  />

                  <input
                    required
                    placeholder="Last name"
                    value={form.lastName}
                    onChange={(e) => update("lastName", e.target.value)}
                    className="rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]"
                  />

                  <input
                    required
                    type="email"
                    placeholder="Email address"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className="rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]"
                  />

                  <input
                    placeholder="Phone number"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    className="rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-black/10 bg-white p-5">
                <h3 className="font-semibold text-black">Brand details</h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <input
                    required
                    placeholder="Brand / company name"
                    value={form.companyName}
                    onChange={(e) => update("companyName", e.target.value)}
                    className="rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]"
                  />

                  <input
                    placeholder="Website"
                    value={form.website}
                    onChange={(e) => update("website", e.target.value)}
                    className="rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]"
                  />

                  <input
                    placeholder="Instagram / social media"
                    value={form.socialMedia}
                    onChange={(e) => update("socialMedia", e.target.value)}
                    className="rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]"
                  />

                  <input
                    required
                    maxLength={2}
                    placeholder="Country code e.g. GB"
                    value={form.countryCode}
                    onChange={(e) =>
                      update("countryCode", e.target.value.toUpperCase())
                    }
                    className="rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]"
                  />

                  <input
                    required
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    className="rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]"
                  />

                  <select
                    aria-label="Website platform"
                    value={form.platformHosted}
                    onChange={(e) =>
                      update("platformHosted", e.target.value as PlatformHosted)
                    }
                    className="rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]"
                  >
                    <option value="SHOPIFY">Shopify</option>
                    <option value="GODADDY">GoDaddy</option>
                    <option value="WIX">Wix</option>
                    <option value="OTHER">Other</option>
                  </select>

                  {form.platformHosted === "OTHER" && (
                    <input
                      placeholder="Platform name"
                      value={form.platformHostedOther}
                      onChange={(e) =>
                        update("platformHostedOther", e.target.value)
                      }
                      className="rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]"
                    />
                  )}

                  <select
                    aria-label="Application source"
                    value={form.applicationSource}
                    onChange={(e) =>
                      update(
                        "applicationSource",
                        e.target.value as ApplicationSource,
                      )
                    }
                    className="rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]"
                  >
                    <option value="MANUAL">Manual</option>
                    <option value="INSTAGRAM_OUTREACH">
                      Instagram Outreach
                    </option>
                    <option value="EMAIL_OUTREACH">Email Outreach</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <textarea
                  placeholder="Internal notes"
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  className="mt-4 min-h-28 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]"
                />
              </div>

              {err && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl bg-[#7B2D3E] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#6a2535] disabled:opacity-50"
              >
                {busy ? "Creating..." : "Create brand application"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}