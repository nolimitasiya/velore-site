// C:\Users\Asiya\projects\dalra\app\admin\brand-invites\BrandInvitesClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import countries from "world-countries";
import citiesByCountry from "@/lib/cities-by-country.json";

type InviteRow = {
  id: string;
  email: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
  brandId: string;
  brand: {
    name: string;
    slug: string;
  };
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function toStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-3xl border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
      {children}
    </label>
  );
}

function statusPill(status: "Active" | "Expired" | "Used/Revoked") {
  if (status === "Active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (status === "Expired") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-black/10 bg-neutral-100 text-neutral-700";
}

export default function AdminBrandInvitesPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "editor" | "viewer">("owner");

  const [countryCode, setCountryCode] = useState("GB");
  const [cityChoice, setCityChoice] = useState("Other");
  const [cityOther, setCityOther] = useState("");

  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const [invites, setInvites] = useState<InviteRow[]>([]);

  const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_IMPORT_TOKEN ?? "";

  const countryOptions = useMemo(() => {
    return countries
      .map((c) => ({ code: c.cca2, name: c.name.common }))
      .filter((x) => x.code && x.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const cityDropdownOptions = useMemo(() => {
    const cc = String(countryCode || "").toUpperCase();
    const list = (citiesByCountry as any)?.[cc] as string[] | undefined;
    const safe = Array.isArray(list) && list.length ? list : ["Other"];
    return safe.includes("Other") ? safe : [...safe, "Other"];
  }, [countryCode]);

  const resolvedCity = useMemo(() => {
    if (cityChoice === "Other") return toStr(cityOther);
    return toStr(cityChoice);
  }, [cityChoice, cityOther]);

  const inviteStats = useMemo(() => {
    const now = Date.now();

    const active = invites.filter(
      (row) => !row.usedAt && new Date(row.expiresAt).getTime() >= now
    ).length;

    const expired = invites.filter(
      (row) => !row.usedAt && new Date(row.expiresAt).getTime() < now
    ).length;

    const usedOrRevoked = invites.filter((row) => Boolean(row.usedAt)).length;

    return {
      total: invites.length,
      active,
      expired,
      usedOrRevoked,
    };
  }, [invites]);

  function onChangeCountry(next: string) {
    const cc = String(next || "").toUpperCase();
    const list = (citiesByCountry as any)?.[cc] as string[] | undefined;
    const opts = Array.isArray(list) && list.length ? list : ["Other"];
    const first = opts[0] ?? "Other";

    setCountryCode(cc);
    setCityChoice(first);
    setCityOther("");
  }

  async function loadInvites() {
    setError(null);
    const r = await fetch("/api/admin/brand-invites/list", {
      headers: { "x-admin-token": ADMIN_TOKEN },
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(j?.error ?? `Failed to load invites (${r.status})`);
      return;
    }
    setInvites(j.invites ?? []);
  }

  useEffect(() => {
    loadInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createInvite() {
    setBusy(true);
    setError(null);
    setOnboardingUrl(null);
    setExpiresAt(null);

    const payload = {
      companyName: toStr(companyName),
      companySlug: toStr(companySlug),
      email: toStr(email).toLowerCase(),
      role,
      countryCode: String(countryCode || "").toUpperCase(),
      city: resolvedCity || null,
    };

    const r = await fetch("/api/admin/brand-invites/create", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-token": ADMIN_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    const j = await r.json().catch(() => ({}));
    setBusy(false);

    if (!r.ok) {
      setError(j?.error ?? `Failed (${r.status})`);
      return;
    }

    setOnboardingUrl(j.onboardingUrl);
    setExpiresAt(j.expiresAt);
    await loadInvites();
  }

  async function revokeInvite(id: string) {
    setBusy(true);
    setError(null);

    const r = await fetch("/api/admin/brand-invites/revoke", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-token": ADMIN_TOKEN,
      },
      body: JSON.stringify({ id }),
    });

    const j = await r.json().catch(() => ({}));
    setBusy(false);

    if (!r.ok) {
      setError(j?.error ?? `Failed (${r.status})`);
      return;
    }

    await loadInvites();
  }

  async function resendInvite(row: InviteRow) {
    setBusy(true);
    setError(null);
    setOnboardingUrl(null);
    setExpiresAt(null);

    const r = await fetch("/api/admin/brand-invites/create", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-token": ADMIN_TOKEN,
      },
      body: JSON.stringify({
        companyName: row.brand.name,
        companySlug: row.brand.slug,
        email: row.email,
        role,
        countryCode: String(countryCode || "").toUpperCase(),
        city: resolvedCity || null,
      }),
    });

    const j = await r.json().catch(() => ({}));
    setBusy(false);

    if (!r.ok) {
      setError(j?.error ?? `Failed (${r.status})`);
      return;
    }

    setOnboardingUrl(j.onboardingUrl);
    setExpiresAt(j.expiresAt);
    await loadInvites();
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  const slugPreview = useMemo(() => {
    if (toStr(companySlug)) return toStr(companySlug);
    if (!toStr(companyName)) return "";
    return slugify(companyName);
  }, [companyName, companySlug]);

  return (
    <main className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto max-w-[1400px] space-y-6 p-6 md:p-8">
        <section className="rounded-[28px] border border-black/10 bg-white px-6 py-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:px-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                Admin onboarding
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-black md:text-4xl">
                Brand invites
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-neutral-500">
                Create invite links for brands, prefill their onboarding setup, and manage
                recent invitations from one clean control panel.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3">
                <div className="text-xs text-neutral-500">Total</div>
                <div className="mt-1 text-xl font-semibold text-black">{inviteStats.total}</div>
              </div>
              <div className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3">
                <div className="text-xs text-neutral-500">Active</div>
                <div className="mt-1 text-xl font-semibold text-black">{inviteStats.active}</div>
              </div>
              <div className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3">
                <div className="text-xs text-neutral-500">Expired</div>
                <div className="mt-1 text-xl font-semibold text-black">{inviteStats.expired}</div>
              </div>
              <div className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3">
                <div className="text-xs text-neutral-500">Used / revoked</div>
                <div className="mt-1 text-xl font-semibold text-black">
                  {inviteStats.usedOrRevoked}
                </div>
              </div>
            </div>
          </div>
        </section>

        <SectionCard className="p-5 md:p-6">
          <div className="space-y-5">
            <div>
              <div className="text-lg font-semibold text-black">Create invite</div>
              <div className="mt-1 text-sm text-neutral-500">
                Generate a new onboarding link for a brand owner, editor, or viewer.
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <FieldLabel>Company name</FieldLabel>
                <input
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
                  placeholder="Company name (e.g. Batul London)"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div>
                <FieldLabel>Company slug</FieldLabel>
                <input
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
                  placeholder="Company slug (optional, e.g. batul-london)"
                  value={companySlug}
                  onChange={(e) => setCompanySlug(e.target.value)}
                />
                <div className="mt-2 text-xs text-neutral-500">
                  Slug preview:{" "}
                  <span className="font-medium text-black">{slugPreview || "—"}</span>
                </div>
              </div>

              <div className="lg:col-span-2">
                <FieldLabel>Invite email</FieldLabel>
                <input
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
                  placeholder="Invite email (brand owner)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <FieldLabel>Country</FieldLabel>
                <select
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
                  value={countryCode}
                  onChange={(e) => onChangeCountry(e.target.value)}
                  aria-label="Country"
                >
                  {countryOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel>Role</FieldLabel>
                <select
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "owner" | "editor" | "viewer")}
                  aria-label="Role"
                >
                  <option value="owner">Owner</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div>
                <FieldLabel>City</FieldLabel>
                <select
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
                  value={cityChoice}
                  onChange={(e) => setCityChoice(e.target.value)}
                  aria-label="City"
                >
                  {cityDropdownOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel>Custom city</FieldLabel>
                <input
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5 disabled:bg-neutral-50 disabled:text-neutral-400"
                  placeholder="Type city"
                  value={cityOther}
                  onChange={(e) => setCityOther(e.target.value)}
                  disabled={cityChoice !== "Other"}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                className="inline-flex items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busy || !toStr(companyName) || !toStr(email) || !toStr(resolvedCity)}
                onClick={createInvite}
              >
                {busy ? "Generating..." : "Generate invite link"}
              </button>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {onboardingUrl ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-emerald-900">Onboarding link ready</div>
                  <div className="mt-1 text-xs text-emerald-800/80">
                    Share this link with the brand so they can complete onboarding.
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-xs break-all text-neutral-700">
                  {onboardingUrl}
                </div>

                {expiresAt ? (
                  <div className="text-xs text-neutral-600">
                    Expires: {new Date(expiresAt).toLocaleString()}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <button
                    className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-black/[0.03]"
                    onClick={() => copy(onboardingUrl)}
                  >
                    Copy link
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard className="overflow-hidden">
          <div className="border-b border-black/10 px-5 py-4">
            <div className="text-lg font-semibold text-black">Recent invites</div>
            <div className="mt-1 text-sm text-neutral-500">
              Review active, expired, and used invite links and regenerate them when needed.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((row) => {
                  const expired = new Date(row.expiresAt).getTime() < Date.now();
                  const status = row.usedAt ? "Used/Revoked" : expired ? "Expired" : "Active";

                  return (
                    <tr key={row.id} className="border-t border-black/6 align-top">
                      <td className="px-4 py-4">
                        <div className="font-medium text-black">{row.brand.name}</div>
                        <div className="mt-1 text-xs text-neutral-500">{row.brand.slug}</div>
                      </td>
                      <td className="px-4 py-4 text-neutral-700">{row.email}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium ${statusPill(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-neutral-700">
                        {new Date(row.expiresAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={busy}
                            onClick={() => resendInvite(row)}
                          >
                            Resend
                          </button>
                          <button
                            className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={busy || Boolean(row.usedAt)}
                            onClick={() => revokeInvite(row.id)}
                          >
                            Revoke
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {invites.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-sm text-neutral-500" colSpan={5}>
                      No invites yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-black/10 px-5 py-4 text-xs text-neutral-500">
            Tip: “Resend” generates a fresh onboarding link that you can paste directly into your email.
          </div>
        </SectionCard>
      </div>
    </main>
  );
}