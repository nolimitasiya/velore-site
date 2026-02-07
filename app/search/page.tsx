// app/search/page.tsx
import Link from "next/link";
import { headers } from "next/headers";


export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type SearchResult = {
  id: string;
  title: string;
  slug: string;
  price: string | null;
  currency: string;
  affiliateUrl: string | null;
  brand: { name: string; slug: string };
  images: { url: string }[];
};

type ApiResponse =
  | { ok: true; products: SearchResult[]; error?: never }
  | { ok: false; products?: SearchResult[]; error: string };

const TYPES = ["abaya", "dress", "skirt", "top", "hijab"] as const;
type ProductType = (typeof TYPES)[number];
const ALLOWED_TYPES = new Set<string>(TYPES as unknown as string[]);

// Next 16 can pass string | string[] | undefined
function toStr(v: unknown) {
  return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
}

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}


async function searchProducts(params: string): Promise<ApiResponse> {
  const h = await headers();

  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";

  if (!host) {
    console.error("[searchProducts] Missing host header");
    return { ok: false, error: "Missing host header" };
  }

  const url = `${proto}://${host}/api/search?${params}`;

  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();

  if (!res.ok) {
    console.error("[searchProducts] API error", res.status, url, text);
    return { ok: false, error: `API ${res.status}` };
  }

  if (!text) {
    console.error("[searchProducts] Empty response body", url);
    return { ok: false, error: "Empty response body" };
  }

  try {
    return JSON.parse(text);
  } catch {
    console.error("[searchProducts] Invalid JSON from API", url, text);
    return { ok: false, error: "Invalid JSON from API" };
  }
}


export default async function SearchPage({
  searchParams,
}: {
  searchParams:
    | Promise<{
        q?: string | string[];
        category?: string | string[];
        occasion?: string | string[];
        material?: string | string[];
        type?: string | string[];
      }>
    | {
        q?: string | string[];
        category?: string | string[];
        occasion?: string | string[];
        material?: string | string[];
        type?: string | string[];
      };
}) {
  const sp = await Promise.resolve(searchParams);

  const q = safeDecode(toStr(sp?.q)).trim();
  const category = safeDecode(toStr(sp?.category)).trim();
  const occasion = safeDecode(toStr(sp?.occasion)).trim();
  const material = safeDecode(toStr(sp?.material)).trim();

  // ✅ Normalise + validate type
  const rawType = safeDecode(toStr(sp?.type)).trim().toLowerCase();
  const type: ProductType | "" = ALLOWED_TYPES.has(rawType) ? (rawType as ProductType) : "";

  // ✅ build query string for API
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (category) qs.set("category", category);
  if (occasion) qs.set("occasion", occasion);
  if (material) qs.set("material", material);
  if (type) qs.set("type", type);

  // ✅ helper to preserve existing params while changing one
  function buildHref(next: Partial<Record<string, string>>) {
    const p = new URLSearchParams(qs.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (!v) p.delete(k);
      else p.set(k, v);
    });
    const s = p.toString();
    return s ? `/search?${s}` : "/search";
  }

  const data = await searchProducts(qs.toString());
  const products: SearchResult[] = data.ok ? data.products ?? [] : [];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-center text-2xl font-semibold">
        Search {q ? `for "${q}"` : ""}
      </h1>

      {/* If API failed, show message instead of silently showing nothing */}
      {!data.ok && (
        <div className="mt-4 text-center text-sm text-red-600">
          Search API error: {data.error}
        </div>
      )}

      {/* Filter chips (type) */}
      <div className="mt-4 flex justify-center">
        <div className="inline-flex flex-wrap justify-center gap-2 text-sm">
          <Link
            href={buildHref({ type: "" })}
            className={[
              "rounded-full border px-3 py-1 transition-colors",
              type === "" ? "bg-black text-white border-black" : "hover:bg-black/5",
            ].join(" ")}
          >
            All
          </Link>

          {TYPES.map((t) => {
            const active = type === t;
            return (
              <Link
                key={t}
                href={buildHref({ type: t })}
                className={[
                  "rounded-full border px-3 py-1 capitalize transition-colors",
                  active ? "bg-black text-white border-black" : "hover:bg-black/5",
                ].join(" ")}
              >
                {t}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <div className="mt-8">
        {products.length === 0 ? (
          <div className="text-sm text-black/60 text-center">No products found.</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const imageUrl = p.images?.[0]?.url ?? null;

              return (
                <div key={p.id} className="rounded-2xl border border-black/10 bg-white">
                  <Link href={`/p/${p.slug}`} className="block">
                    <div className="aspect-[3/4] w-full overflow-hidden rounded-t-2xl bg-black/5">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt={p.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-black/40">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="text-sm font-medium">{p.title}</div>
                      <div className="mt-1 text-xs text-black/60 uppercase tracking-wide">
                        {p.brand?.name ?? ""}
                      </div>

                      {p.price ? (
                        <div className="mt-2 text-sm">
                          {p.currency} {p.price}
                        </div>
                      ) : null}
                    </div>
                  </Link>

                  <div className="px-4 pb-4">
                    <Link
                      href={`/out/${p.id}`}
                      className="inline-flex w-full items-center justify-center rounded-md bg-black px-4 py-2 text-sm text-white"
                    >
                      Buy Now
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
