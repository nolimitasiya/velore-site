import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  accountStatus: string;
  stripeCustomerId: string | null;
  stripeSubscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  pastDueSince: string | null;
};

async function getBrands(): Promise<BrandRow[]> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  const res = await fetch(`${base}/api/admin/brands`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  return json?.brands ?? [];
}

export default async function AdminBrandsPage() {
  const brands = await getBrands();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Brands</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Total: <span className="font-medium">{brands.length}</span>
          </p>
        </div>

        <Link
          href="/admin/brands/applications"
          className="rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-black/5"
        >
          View Applications
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-black/[0.03] text-left">
            <tr>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Stripe</th>
              <th className="px-4 py-3">Period End</th>
              <th className="px-4 py-3">Past Due Since</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.id} className="border-t border-black/10">
                <td className="px-4 py-3">
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-black/50">{b.slug}</div>
                </td>
                <td className="px-4 py-3">{b.accountStatus}</td>
                <td className="px-4 py-3">
                  {b.stripeSubscriptionStatus ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {b.currentPeriodEnd ? new Date(b.currentPeriodEnd).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">
                  {b.pastDueSince ? new Date(b.pastDueSince).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <ForceResetButton brandId={b.id} />
                  </div>
                </td>
              </tr>
            ))}

            {brands.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-black/60" colSpan={6}>
                  No brands yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

/** client button component inside server page */
function ForceResetButton({ brandId }: { brandId: string }) {
  "use client";
  const [busy, setBusy] = (require("react") as typeof import("react")).useState(false);
  const [done, setDone] = (require("react") as typeof import("react")).useState<string | null>(null);

  async function onClick() {
    if (!confirm("Send a password reset link to the brand owner/admin email?")) return;

    setBusy(true);
    setDone(null);
    try {
      const res = await fetch(`/api/admin/brands/${brandId}/force-reset`, {
        method: "POST",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Failed");
      setDone("Sent");
      setTimeout(() => setDone(null), 2000);
    } catch (e: any) {
      alert(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="rounded-lg border border-black/10 px-3 py-2 text-xs hover:bg-black/5 disabled:opacity-50"
      type="button"
    >
      {busy ? "Sending..." : done ? "Sent ✓" : "Force reset"}
    </button>
  );
}
