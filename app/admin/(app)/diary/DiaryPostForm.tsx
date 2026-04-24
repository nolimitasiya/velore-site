"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RichTextEditor from "@/components/admin/editor/RichTextEditor";

type DiaryStatus = "DRAFT" | "PUBLISHED";

type ProductStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "NEEDS_CHANGES"
  | "REJECTED";

type RelatedProductItem = {
  id: string;
  title: string;
  slug: string;
  price: string | null;
  currency: string;
  isActive: boolean;
  publishedAt: string | null;
  status: ProductStatus;
  brand: {
    id: string;
    name: string;
    slug: string;
  };
  imageUrl: string | null;
};

type BrandSearchResult = {
  id: string;
  name: string;
  slug: string;
  baseCountryCode?: string | null;
};

type DiaryPostFormValues = {
  id?: string;
  title: string;
  slug: string;
  editorName: string;
  excerpt: string;
  coverImageUrl: string;
  coverImageAlt: string;
  contentHtml: string;
  shopSectionEyebrow: string;
  shopSectionTitle: string;
  shopSectionSubtitle: string;
  relatedProducts: RelatedProductItem[];
  status: DiaryStatus;
};

type Props = {
  mode: "create" | "edit";
  initialValues: DiaryPostFormValues;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function DiaryPostForm({ mode, initialValues }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(initialValues.title);
  const [slug, setSlug] = useState(initialValues.slug);
  const [editorName, setEditorName] = useState(initialValues.editorName);
  const [excerpt, setExcerpt] = useState(initialValues.excerpt);
  const [coverImageUrl, setCoverImageUrl] = useState(initialValues.coverImageUrl);
  const [coverImageAlt, setCoverImageAlt] = useState(initialValues.coverImageAlt);
  const [contentHtml, setContentHtml] = useState(initialValues.contentHtml);
  const [status, setStatus] = useState<DiaryStatus>(initialValues.status);
    const [shopSectionEyebrow, setShopSectionEyebrow] = useState(
    initialValues.shopSectionEyebrow
  );
  const [shopSectionTitle, setShopSectionTitle] = useState(
    initialValues.shopSectionTitle
  );
  const [shopSectionSubtitle, setShopSectionSubtitle] = useState(
    initialValues.shopSectionSubtitle
  );

  const [relatedProducts, setRelatedProducts] = useState<RelatedProductItem[]>(
    initialValues.relatedProducts ?? []
  );

  const [brandSearch, setBrandSearch] = useState("");
  const [brandResults, setBrandResults] = useState<BrandSearchResult[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<BrandSearchResult | null>(null);

  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<RelatedProductItem[]>([]);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const previewUrl = useMemo(() => {
    return slug ? `/diary/${slug}` : "";
  }, [slug]);

  async function searchBrands(query: string) {
    if (!query.trim()) {
      setBrandResults([]);
      return;
    }

    const res = await fetch(
      `/api/admin/brands/search?q=${encodeURIComponent(query)}&take=8`,
      { cache: "no-store" }
    );

    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) return;

    setBrandResults(json.brands ?? []);
  }

  async function searchProducts(query: string) {
    if (!query.trim()) {
      setProductResults([]);
      return;
    }

    const url =
      `/api/storefront/products?q=${encodeURIComponent(query)}&take=8` +
      (selectedBrand?.id ? `&brandId=${encodeURIComponent(selectedBrand.id)}` : "");

    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.ok) return;

    setProductResults(json.products ?? []);
  }

  function addRelatedProduct(product: RelatedProductItem) {
    setRelatedProducts((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      return [...prev, product];
    });

    setProductSearch("");
    setProductResults([]);
  }

  function removeRelatedProduct(productId: string) {
    setRelatedProducts((prev) => prev.filter((p) => p.id !== productId));
  }

  function moveRelatedProduct(index: number, direction: "up" | "down") {
    setRelatedProducts((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;

      if (target < 0 || target >= next.length) return prev;

      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        editorName: editorName.trim(),
        excerpt: excerpt.trim(),
        coverImageUrl: coverImageUrl.trim(),
        coverImageAlt: coverImageAlt.trim(),
        contentHtml: contentHtml.trim(),
        shopSectionEyebrow: shopSectionEyebrow.trim(),
        shopSectionTitle: shopSectionTitle.trim(),
        shopSectionSubtitle: shopSectionSubtitle.trim(),
        relatedProductIds: relatedProducts.map((product) => product.id),
        status,
      };

      const res = await fetch(
        mode === "create" ? "/api/admin/diary" : `/api/admin/diary/${initialValues.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save diary post.");
      }

      if (mode === "create") {
        router.push(`/admin/diary/${json.post.id}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save diary post.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (mode !== "edit" || !initialValues.id) return;
    const ok = window.confirm("Delete this diary post?");
    if (!ok) return;

    setDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/diary/${initialValues.id}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to delete diary post.");
      }

      router.push("/admin/diary");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete diary post.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-black/45">
              Editorial
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-black">
              {mode === "create" ? "New diary post" : "Edit diary post"}
            </h1>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
            <label className="block">
              <div className="mb-2 text-sm font-medium text-black">Title</div>
              <input
                value={title}
                onChange={(e) => {
                  const next = e.target.value;
                  setTitle(next);
                  if (!slug || slug === slugify(title)) {
                    setSlug(slugify(next));
                  }
                }}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black"
                placeholder="Winter neutrals for modest dressing"
                required
              />
            </label>

            <label className="block">
              <div className="mb-2 text-sm font-medium text-black">Slug</div>
              <input
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black"
                placeholder="winter-neutrals-for-modest-dressing"
                required
              />
            </label>
          </div>

          <label className="block">
            <div className="mb-2 text-sm font-medium text-black">Editor</div>
            <input
              value={editorName}
              onChange={(e) => setEditorName(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black"
              placeholder="Asiya Mohamed"
            />
          </label>

          <label className="block">
            <div className="mb-2 text-sm font-medium text-black">Excerpt</div>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black"
              placeholder="A short summary shown on diary cards and listing pages."
            />
          </label>

          <div className="grid gap-6 md:grid-cols-2">
            <label className="block">
              <div className="mb-2 text-sm font-medium text-black">Cover image URL</div>
              <input
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black"
                placeholder="https://..."
              />
            </label>

            <label className="block">
              <div className="mb-2 text-sm font-medium text-black">Cover image alt text</div>
              <input
                value={coverImageAlt}
                onChange={(e) => setCoverImageAlt(e.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black"
                placeholder="Editorial image alt text"
              />
            </label>
          </div>

          <div className="block">
            <div className="mb-2 text-sm font-medium text-black">Content</div>
            <RichTextEditor
              value={contentHtml}
              onChange={setContentHtml}
              placeholder="Write your diary post here..."
            />
          </div>

                    <div className="rounded-[28px] border border-black/10 bg-white p-5">
            <div className="mb-4">
              <div className="text-sm font-medium text-black">Shop section copy</div>
              <p className="mt-1 text-xs leading-5 text-black/50">
                Optional custom copy for the related products section shown at the
                bottom of the article.
              </p>
            </div>

            <div className="grid gap-4">
              <label className="block">
                <div className="mb-2 text-sm font-medium text-black">Eyebrow</div>
                <input
                  value={shopSectionEyebrow}
                  onChange={(e) => setShopSectionEyebrow(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black"
                  placeholder="Shop the Edit"
                />
              </label>

              <label className="block">
                <div className="mb-2 text-sm font-medium text-black">Title</div>
                <input
                  value={shopSectionTitle}
                  onChange={(e) => setShopSectionTitle(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black"
                  placeholder="Inspired by this story"
                />
              </label>

              <label className="block">
                <div className="mb-2 text-sm font-medium text-black">Subtitle</div>
                <textarea
                  value={shopSectionSubtitle}
                  onChange={(e) => setShopSectionSubtitle(e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black"
                  placeholder="A curated selection to complement the editorial."
                />
              </label>
            </div>
          </div>

          <div className="rounded-[28px] border border-black/10 bg-white p-5">
            <div className="mb-4">
              <div className="text-sm font-medium text-black">Related products</div>
              <p className="mt-1 text-xs leading-5 text-black/50">
                These products will appear in the “Shop the Edit” section under
                “Inspired by this story.”
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Search brands..."
                  value={brandSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    setBrandSearch(value);
                    searchBrands(value);
                  }}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                />

                {selectedBrand && (
                  <div className="flex items-center justify-between rounded-xl border border-black/10 bg-black/5 px-3 py-2 text-sm">
                    <span>
                      Selected brand: <strong>{selectedBrand.name}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBrand(null);
                        setBrandSearch("");
                        setBrandResults([]);
                        setProductSearch("");
                        setProductResults([]);
                      }}
                      className="text-xs text-red-600"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {brandResults.length > 0 && (
                  <div className="rounded-xl border border-black/10 bg-white p-2">
                    {brandResults.map((brand) => (
                      <button
                        key={brand.id}
                        type="button"
                        onClick={() => {
                          setSelectedBrand(brand);
                          setBrandSearch(brand.name);
                          setBrandResults([]);
                          setProductSearch("");
                          setProductResults([]);
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-black/5"
                      >
                        <span>{brand.name}</span>
                        <span className="text-xs text-black/40">
                          {brand.baseCountryCode ?? brand.slug}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="text"
                placeholder={
                  selectedBrand
                    ? `Search ${selectedBrand.name} products...`
                    : "Search products..."
                }
                value={productSearch}
                onChange={(e) => {
                  const value = e.target.value;
                  setProductSearch(value);
                  searchProducts(value);
                }}
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />

              {productResults.length > 0 && (
                <div className="rounded-xl border border-black/10 bg-white p-2">
                  {productResults.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addRelatedProduct(product)}
                      className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-black/5"
                    >
                      <span>{product.title}</span>
                      <span className="text-xs text-black/40">
                        {product.brand?.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              {relatedProducts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-black/10 px-4 py-6 text-sm text-black/50">
                  No related products assigned yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {relatedProducts.map((product, index) => (
                    <article
                      key={product.id}
                      className="overflow-hidden rounded-2xl border border-black/10 bg-white"
                    >
                      <div className="aspect-[4/5] bg-black/5">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-black/40">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="rounded-full border border-black/10 bg-black/5 px-2.5 py-1 text-[11px]">
                            Position {index}
                          </span>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] ${
                              product.status === "APPROVED"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-black/10 bg-black/5 text-black/60"
                            }`}
                          >
                            {product.status.replaceAll("_", " ")}
                          </span>
                        </div>

                        <div>
                          <div className="font-medium leading-tight">{product.title}</div>
                          <div className="mt-1 text-xs text-black/50">
                            {product.brand.name}
                          </div>
                          <div className="mt-1 text-xs text-black/40">{product.slug}</div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-[11px] text-black/60">
                          <span className="rounded-full border border-black/10 px-2 py-1">
                            {product.isActive ? "Active" : "Inactive"}
                          </span>

                          <span className="rounded-full border border-black/10 px-2 py-1">
                            {product.publishedAt ? "Published" : "Draft"}
                          </span>

                          <span className="rounded-full border border-black/10 px-2 py-1">
                            {product.price
                              ? `${product.price} ${product.currency}`
                              : "No price"}
                          </span>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => moveRelatedProduct(index, "up")}
                            className="text-xs"
                          >
                            ↑
                          </button>

                          <button
                            type="button"
                            onClick={() => moveRelatedProduct(index, "down")}
                            className="text-xs"
                          >
                            ↓
                          </button>

                          <button
                            type="button"
                            onClick={() => removeRelatedProduct(product.id)}
                            className="text-xs text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
            <label className="block">
              <div className="mb-2 text-sm font-medium text-black">Status</div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DiaryStatus)}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-black"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
              </select>
            </label>

            <div className="rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-4 text-sm text-black/60">
              Public preview URL:{" "}
              {previewUrl ? (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-black/20 underline-offset-4"
                >
                  {previewUrl}
                </a>
              ) : (
                "—"
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : mode === "create" ? "Create post" : "Save changes"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/admin/diary")}
              className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-black/[0.03]"
            >
              Back
            </button>

            {mode === "edit" ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="inline-flex items-center justify-center rounded-full border border-red-200 bg-white px-5 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  );
}