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

export default function AdminBrandInvitesPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "editor" | "viewer">("owner");

  // ✅ location
  const [countryCode, setCountryCode] = useState("GB");
  const [cityChoice, setCityChoice] = useState("Other");
  const [cityOther, setCityOther] = useState("");

  // results
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
      // ✅ slug optional — server can auto-generate if blank
      companySlug: toStr(companySlug),
      email: toStr(email).toLowerCase(),
      role,

      // ✅ location sent to server
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

    // Resend by generating a fresh invite (same effect)
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

        // keep currently selected location (or you can ignore)
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
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Brand Invites</h1>
      </div>

      <div className="rounded-2xl border p-4 space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="rounded-lg border p-2 text-sm"
            placeholder="Company name (e.g. Batul London)"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />

          <div className="space-y-1">
            <input
              className="rounded-lg border p-2 text-sm w-full"
              placeholder="Company slug (optional, e.g. batul-london)"
              value={companySlug}
              onChange={(e) => setCompanySlug(e.target.value)}
            />
            <div className="text-xs text-black/60">
              Slug preview: <span className="font-medium">{slugPreview || "—"}</span>
            </div>
          </div>

          <input
            className="rounded-lg border p-2 text-sm sm:col-span-2"
            placeholder="Invite email (brand owner)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* ✅ Country */}
          <select
            className="rounded-lg border p-2 text-sm bg-white"
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

          {/* ✅ City */}
          <div className="space-y-2">
            <select
              className="rounded-lg border p-2 text-sm bg-white w-full"
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

            {cityChoice === "Other" && (
              <input
                className="rounded-lg border p-2 text-sm w-full"
                placeholder="Type city"
                value={cityOther}
                onChange={(e) => setCityOther(e.target.value)}
              />
            )}
          </div>

          <select
            className="rounded-lg border p-2 text-sm bg-white"
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            aria-label="Role"
          >
            <option value="owner">Owner</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>

          <button
            className="rounded-lg bg-black text-white px-4 py-2 text-sm disabled:opacity-50"
            disabled={busy || !toStr(companyName) || !toStr(email) || !toStr(resolvedCity)}
            onClick={createInvite}
          >
            {busy ? "Generating..." : "Generate invite link"}
          </button>
        </div>

        {error && <div className="text-sm text-red-700">{error}</div>}

        {onboardingUrl && (
          <div className="rounded-xl border p-3 space-y-2">
            <div className="text-sm font-medium">Onboarding link</div>
            <div className="text-xs break-all text-black/70">{onboardingUrl}</div>
            {expiresAt && (
              <div className="text-xs text-black/60">
                Expires: {new Date(expiresAt).toLocaleString()}
              </div>
            )}
            <div className="flex gap-2">
              <button className="rounded-lg border px-3 py-1 text-xs" onClick={() => copy(onboardingUrl)}>
                Copy link
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border p-4 space-y-3">
        <h2 className="text-lg font-semibold">Recent invites</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-black/60">
              <tr>
                <th className="py-2 pr-4">Company</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Expires</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((row) => {
                const expired = new Date(row.expiresAt).getTime() < Date.now();
                const status = row.usedAt ? "Used/Revoked" : expired ? "Expired" : "Active";

                return (
                  <tr key={row.id} className="border-t">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{row.brand.name}</div>
                      <div className="text-xs text-black/60">{row.brand.slug}</div>
                    </td>
                    <td className="py-2 pr-4">{row.email}</td>
                    <td className="py-2 pr-4">{status}</td>
                    <td className="py-2 pr-4">{new Date(row.expiresAt).toLocaleString()}</td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-lg border px-3 py-1 text-xs disabled:opacity-50"
                          disabled={busy}
                          onClick={() => resendInvite(row)}
                        >
                          Resend
                        </button>
                        <button
                          className="rounded-lg border px-3 py-1 text-xs disabled:opacity-50"
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
                  <td className="py-3 text-black/60" colSpan={5}>
                    No invites yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-black/60">
          Tip: “Resend” generates a fresh onboarding link and you can paste it into your email.
        </div>
      </div>
    </main>
  );
}
