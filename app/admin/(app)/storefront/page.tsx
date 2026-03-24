"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import CountrySelect from "@/components/admin/CountrySelect";
import CountryMultiSelect from "@/components/admin/CountryMultiSelect";
import { COUNTRY_OPTIONS } from "@/lib/geo/countries";

type StorefrontSectionType = "DEFAULT" | "COUNTRY" | "CAMPAIGN";

type StorefrontSectionItem = {
  id: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    title: string;
    slug: string;
    price: string | null;
    currency: string;
    isActive: boolean;
    publishedAt: string | null;
    status: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "NEEDS_CHANGES" | "REJECTED";
    brand: {
      id: string;
      name: string;
      slug: string;
    };
    imageUrl: string | null;
  };
};

type StorefrontSection = {
  id: string;
  key: string;
  title: string;
  type: StorefrontSectionType;
  targetCountryCode: string | null;
  campaignAppliesToAllCountries: boolean;
  campaignCountries: string[];
  isActive: boolean;
  isDefault: boolean; // temporary compatibility
  maxItems: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  items: StorefrontSectionItem[];
};

type NewSectionForm = {
  title: string;
  type: StorefrontSectionType;
  targetCountryCode: string | null;
  campaignAppliesToAllCountries: boolean;
  campaignCountries: string[];
  isActive: boolean;
  maxItems: number;
  sortOrder: number;
};


export default function AdminStorefrontPage(){ 
  const [sections, setSections] = useState<StorefrontSection[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<Record<string, any[]>>({});

  const [selectedBrand, setSelectedBrand] = useState<Record<string, any | null>>({});

  const [brandSearch, setBrandSearch] = useState<Record<string, string>>({});
  const [brandResults, setBrandResults] = useState<Record<string, any[]>>({});
  

    const [creating, setCreating] = useState(false);

  const [newSection, setNewSection] = useState<NewSectionForm>({
    title: "",
    type: "CAMPAIGN",
    targetCountryCode: null,
    campaignAppliesToAllCountries: true,
    campaignCountries: [],
    isActive: true,
    maxItems: 4,
    sortOrder: 0,
  });


  async function load() {
    setBusy(true);
    setError(null);

    const res = await fetch("/api/admin/storefront", {
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.ok) {
      setError(json?.error ?? "Failed to load storefront sections");
      setBusy(false);
      return;
    }

    setSections(json.sections ?? []);
    setBusy(false);
  }

  async function searchProducts(sectionId: string, query: string) {
  if (!query.trim()) {
    setSearchResults((prev) => ({ ...prev, [sectionId]: [] }));
    return;
  }

  const selected = selectedBrand[sectionId];

  const url =
    `/api/storefront/products?q=${encodeURIComponent(query)}&take=8&sectionId=${sectionId}` +
    (selected?.id ? `&brandId=${encodeURIComponent(selected.id)}` : "");

  const res = await fetch(url, { cache: "no-store" });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json.ok) return;

  setSearchResults((prev) => ({
    ...prev,
    [sectionId]: json.products ?? [],
  }));
}


async function searchBrands(sectionId: string, query: string) {
  if (!query.trim()) {
    setBrandResults((prev) => ({ ...prev, [sectionId]: [] }));
    return;
  }

  const res = await fetch(
    `/api/admin/brands/search?q=${encodeURIComponent(query)}&take=8`,
    { cache: "no-store" }
  );

  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json.ok) return;

  setBrandResults((prev) => ({
    ...prev,
    [sectionId]: json.brands ?? [],
  }));
}



  useEffect(() => {
    load();
  }, []);

  function updateSection(
    sectionId: string,
    updater: (s: StorefrontSection) => StorefrontSection
  ) {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? updater(s) : s)));
  }

  function addProduct(sectionId: string, product: any) {
    updateSection(sectionId, (section) => {
      if (section.items.some((i) => i.product.id === product.id)) return section;
      if (section.items.length >= section.maxItems) return section;

      return {
        ...section,
        items: [
          ...section.items,
          {
            id: `temp-${product.id}`,
            position: section.items.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            product: {
              id: product.id,
              title: product.title,
              slug: product.slug ?? "",
              price: product.price ?? null,
              currency: product.currency ?? "GBP",
              isActive: product.isActive ?? true,
              publishedAt: product.publishedAt ?? null,
              status: product.status ?? "APPROVED",
              brand: product.brand ?? { id: "", name: "Unknown", slug: "" },
              imageUrl: product.imageUrl ?? null,
            },
          },
        ],
      };
    });

    setSearch((prev) => ({ ...prev, [sectionId]: "" }));
    setSearchResults((prev) => ({ ...prev, [sectionId]: [] }));
  }

  function removeProduct(sectionId: string, itemId: string) {
    updateSection(sectionId, (section) => ({
      ...section,
      items: section.items
        .filter((i) => i.id !== itemId)
        .map((i, idx) => ({ ...i, position: idx })),
    }));
  }

  function moveItem(sectionId: string, index: number, direction: "up" | "down") {
    updateSection(sectionId, (section) => {
      const items = [...section.items];
      const newIndex = direction === "up" ? index - 1 : index + 1;

      if (newIndex < 0 || newIndex >= items.length) return section;

      [items[index], items[newIndex]] = [items[newIndex], items[index]];

      return {
        ...section,
        items: items.map((i, idx) => ({ ...i, position: idx })),
      };
    });
  }

  function toggleCampaignCountry(sectionId: string, countryCode: string) {
    updateSection(sectionId, (section) => {
      const exists = section.campaignCountries.includes(countryCode);

      return {
        ...section,
        campaignCountries: exists
          ? section.campaignCountries.filter((c) => c !== countryCode)
          : [...section.campaignCountries, countryCode].sort(),
      };
    });
  }
  
    function toggleNewSectionCampaignCountry(countryCode: string) {
    setNewSection((prev) => {
      const exists = prev.campaignCountries.includes(countryCode);

      return {
        ...prev,
        campaignCountries: exists
          ? prev.campaignCountries.filter((c) => c !== countryCode)
          : [...prev.campaignCountries, countryCode].sort(),
      };
    });
  }

    async function createSection() {
    setCreating(true);

    const res = await fetch("/api/admin/storefront", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newSection.title,
        type: newSection.type,
        targetCountryCode:
          newSection.type === "COUNTRY" ? newSection.targetCountryCode : null,
        campaignAppliesToAllCountries:
          newSection.type === "CAMPAIGN"
            ? newSection.campaignAppliesToAllCountries
            : false,
        campaignCountries:
          newSection.type === "CAMPAIGN" && !newSection.campaignAppliesToAllCountries
            ? newSection.campaignCountries
            : [],
        isActive: newSection.isActive,
        maxItems: newSection.maxItems,
        sortOrder: newSection.sortOrder,
      }),
    });

    const json = await res.json().catch(() => ({}));

    setCreating(false);

    if (!res.ok || !json.ok) {
      alert(json?.error ?? "Failed to create section");
      return;
    }

    setNewSection({
      title: "",
      type: "CAMPAIGN",
      targetCountryCode: null,
      campaignAppliesToAllCountries: true,
      campaignCountries: [],
      isActive: true,
      maxItems: 4,
      sortOrder: 0,
    });

    alert("Section created!");
    await load();
  }


    async function deleteSection(section: StorefrontSection) {
    const confirmed = window.confirm(
      `Delete "${section.title}"? This will remove the section and all its assigned products.`
    );

    if (!confirmed) return;

    setSaving(section.id);

    const res = await fetch(`/api/admin/storefront/${section.id}`, {
      method: "DELETE",
    });

    const json = await res.json().catch(() => ({}));

    setSaving(null);

    if (!res.ok || !json.ok) {
      alert(json?.error ?? "Failed to delete section");
      return;
    }

    alert("Section deleted");
    await load();
  }
  

  async function saveSection(section: StorefrontSection) {
    setSaving(section.id);

    const res = await fetch(`/api/admin/storefront/${section.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: section.title,
        type: section.type,
        targetCountryCode:
          section.type === "COUNTRY" ? section.targetCountryCode : null,
        campaignAppliesToAllCountries:
          section.type === "CAMPAIGN"
            ? section.campaignAppliesToAllCountries
            : false,
        campaignCountries:
          section.type === "CAMPAIGN" && !section.campaignAppliesToAllCountries
            ? section.campaignCountries
            : [],
        isActive: section.isActive,
        isDefault: section.type === "DEFAULT",
        maxItems: section.maxItems,
        sortOrder: section.sortOrder,
        productIds: Array.from(
          new Set(
            section.items
              .map((i) => i.product?.id)
              .filter((id): id is string => Boolean(id))
          )
        ),
      }),
    });

    const json = await res.json().catch(() => ({}));

    setSaving(null);

    if (!res.ok || !json.ok) {
      alert(json?.error ?? "Failed to save section");
      return;
    }

    alert("Saved!");
    await load();
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-6 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Storefront</h1>
          <p className="mt-1 text-sm text-black/60">
            Manage homepage merchandising sections, country targeting, and campaigns.
          </p>
        </div>

        
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}


      <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Create section</h2>
          <p className="mt-1 text-sm text-black/60">
            Create a new campaign, country-targeted section, or fallback section.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1">
            <span className="text-sm font-medium">Title</span>
            <input
              type="text"
              value={newSection.title}
              onChange={(e) =>
                setNewSection((prev) => ({
                  ...prev,
                  title: e.target.value,
                }))
              }
              placeholder="e.g. Trending This Week Australia"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">Type</span>
            <select
              value={newSection.type}
              onChange={(e) => {
                const nextType = e.target.value as StorefrontSectionType;

                setNewSection((prev) => ({
                  ...prev,
                  type: nextType,
                  targetCountryCode:
                    nextType === "COUNTRY" ? prev.targetCountryCode ?? "GB" : null,
                  campaignAppliesToAllCountries:
                    nextType === "CAMPAIGN"
                      ? prev.campaignAppliesToAllCountries
                      : false,
                  campaignCountries:
                    nextType === "CAMPAIGN" ? prev.campaignCountries : [],
                }));
              }}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            >
              <option value="DEFAULT">DEFAULT</option>
              <option value="COUNTRY">COUNTRY</option>
              <option value="CAMPAIGN">CAMPAIGN</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">Max items</span>
            <input
              type="number"
              min={1}
              max={24}
              value={newSection.maxItems}
              onChange={(e) =>
                setNewSection((prev) => ({
                  ...prev,
                  maxItems: Number(e.target.value) || 4,
                }))
              }
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">Sort order</span>
            <input
              type="number"
              value={newSection.sortOrder}
              onChange={(e) =>
                setNewSection((prev) => ({
                  ...prev,
                  sortOrder: Number(e.target.value) || 0,
                }))
              }
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-6">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newSection.isActive}
              onChange={(e) =>
                setNewSection((prev) => ({
                  ...prev,
                  isActive: e.target.checked,
                }))
              }
            />
            Active
          </label>

          {newSection.type === "CAMPAIGN" && (
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newSection.campaignAppliesToAllCountries}
                onChange={(e) =>
                  setNewSection((prev) => ({
                    ...prev,
                    campaignAppliesToAllCountries: e.target.checked,
                    campaignCountries: e.target.checked ? [] : prev.campaignCountries,
                  }))
                }
              />
              Applies to all countries
            </label>
          )}
        </div>



{newSection.type === "COUNTRY" && (
  <div className="mt-4 max-w-sm">
    <CountrySelect
      label="Target country"
      value={newSection.targetCountryCode}
      onChange={(code) =>
        setNewSection((prev) => ({
          ...prev,
          targetCountryCode: code,
        }))
      }
    />
  </div>
)}

        <button
          onClick={createSection}
          disabled={creating}
          className="mt-6 rounded-lg border border-black/10 px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create section"}
        </button>
      </section>




      {busy ? (
        <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-black/60">
          Loading storefront sections...
        </div>
      ) : sections.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-black/60">
          No storefront sections found.
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <section
              key={section.id}
              className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div>
                    <h2 className="text-xl font-semibold">{section.title}</h2>
                    <p className="text-sm text-black/50">{section.key}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-black/10 bg-black/5 px-3 py-1">
                      {section.isActive ? "Active" : "Inactive"}
                    </span>

                    <span className="rounded-full border border-black/10 bg-black/5 px-3 py-1">
                      Type: {section.type}
                    </span>

                    <span className="rounded-full border border-black/10 bg-black/5 px-3 py-1">
                      Country: {section.targetCountryCode ?? "Global"}
                    </span>

                    {section.type === "CAMPAIGN" && (
                      <span className="rounded-full border border-black/10 bg-black/5 px-3 py-1">
                        {section.campaignAppliesToAllCountries
                          ? "All countries"
                          : `Targets: ${section.campaignCountries.join(", ") || "None"}`}
                      </span>
                    )}

                    <span className="rounded-full border border-black/10 bg-black/5 px-3 py-1">
                      Max items: {section.maxItems}
                    </span>

                    <span className="rounded-full border border-black/10 bg-black/5 px-3 py-1">
                      Sort order: {section.sortOrder}
                    </span>
                  </div>
                </div>

                <div className="text-sm text-black/50">
                  {section.items.length} / {section.maxItems} products
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-1">
                  <span className="text-sm font-medium">Title</span>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) =>
                      updateSection(section.id, (s) => ({
                        ...s,
                        title: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium">Type</span>
                  <select
                    value={section.type}
                    onChange={(e) => {
                      const nextType = e.target.value as StorefrontSectionType;

                      updateSection(section.id, (s) => ({
                        ...s,
                        type: nextType,
                        isDefault: nextType === "DEFAULT",
                        targetCountryCode:
                          nextType === "COUNTRY" ? s.targetCountryCode ?? "GB" : null,
                        campaignAppliesToAllCountries:
                          nextType === "CAMPAIGN"
                            ? s.campaignAppliesToAllCountries
                            : false,
                        campaignCountries:
                          nextType === "CAMPAIGN" ? s.campaignCountries : [],
                      }));
                    }}
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  >
                    <option value="DEFAULT">DEFAULT</option>
                    <option value="COUNTRY">COUNTRY</option>
                    <option value="CAMPAIGN">CAMPAIGN</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium">Max items</span>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={section.maxItems}
                    onChange={(e) =>
                      updateSection(section.id, (s) => ({
                        ...s,
                        maxItems: Number(e.target.value) || 4,
                      }))
                    }
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium">Sort order</span>
                  <input
                    type="number"
                    value={section.sortOrder}
                    onChange={(e) =>
                      updateSection(section.id, (s) => ({
                        ...s,
                        sortOrder: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-6">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={section.isActive}
                    onChange={(e) =>
                      updateSection(section.id, (s) => ({
                        ...s,
                        isActive: e.target.checked,
                      }))
                    }
                  />
                  Active
                </label>

                {section.type === "CAMPAIGN" && (
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={section.campaignAppliesToAllCountries}
                      onChange={(e) =>
                        updateSection(section.id, (s) => ({
                          ...s,
                          campaignAppliesToAllCountries: e.target.checked,
                          campaignCountries: e.target.checked ? [] : s.campaignCountries,
                        }))
                      }
                    />
                    Applies to all countries
                  </label>
                )}
              </div>

              {section.type === "COUNTRY" && (
  <div className="mt-4 max-w-sm">
    <CountrySelect
      label="Target country"
      value={section.targetCountryCode}
      onChange={(code) =>
        updateSection(section.id, (s) => ({
          ...s,
          targetCountryCode: code,
        }))
      }
    />
  </div>
)}

           {section.type === "CAMPAIGN" && !section.campaignAppliesToAllCountries && (
  <div className="mt-4 max-w-2xl">
    <CountryMultiSelect
      label="Campaign countries"
      value={section.campaignCountries}
      onChange={(codes) =>
        updateSection(section.id, (s) => ({
          ...s,
          campaignCountries: codes,
        }))
      }
    />
  </div>
)}

              <div className="mt-6 space-y-3">
  <div className="space-y-2">
    <input
      type="text"
      placeholder="Search brands..."
      value={brandSearch[section.id] ?? ""}
      onChange={(e) => {
        const value = e.target.value;
        setBrandSearch((prev) => ({ ...prev, [section.id]: value }));
        searchBrands(section.id, value);
      }}
      className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
    />

    {selectedBrand[section.id] && (
      <div className="flex items-center justify-between rounded-xl border border-black/10 bg-black/5 px-3 py-2 text-sm">
        <span>
          Selected brand: <strong>{selectedBrand[section.id].name}</strong>
        </span>
        <button
          type="button"
          onClick={() => {
            setSelectedBrand((prev) => ({ ...prev, [section.id]: null }));
            setBrandSearch((prev) => ({ ...prev, [section.id]: "" }));
            setBrandResults((prev) => ({ ...prev, [section.id]: [] }));
            setSearch((prev) => ({ ...prev, [section.id]: "" }));
            setSearchResults((prev) => ({ ...prev, [section.id]: [] }));
          }}
          className="text-xs text-red-600"
        >
          Clear
        </button>
      </div>
    )}

    {brandResults[section.id]?.length > 0 && (
      <div className="rounded-xl border border-black/10 bg-white p-2">
        {brandResults[section.id].map((brand: any) => (
          <button
            key={brand.id}
            type="button"
            onClick={() => {
              setSelectedBrand((prev) => ({ ...prev, [section.id]: brand }));
              setBrandSearch((prev) => ({ ...prev, [section.id]: brand.name }));
              setBrandResults((prev) => ({ ...prev, [section.id]: [] }));
              setSearch((prev) => ({ ...prev, [section.id]: "" }));
              setSearchResults((prev) => ({ ...prev, [section.id]: [] }));
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
      selectedBrand[section.id]
        ? `Search ${selectedBrand[section.id].name} products...`
        : "Search products..."
    }
    value={search[section.id] ?? ""}
    onChange={(e) => {
      const value = e.target.value;
      setSearch((prev) => ({ ...prev, [section.id]: value }));
      searchProducts(section.id, value);
    }}
    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
  />

  {searchResults[section.id]?.length > 0 && (
    <div className="rounded-xl border border-black/10 bg-white p-2">
      {searchResults[section.id].map((p: any) => (
        <button
          key={p.id}
          onClick={() => addProduct(section.id, p)}
          className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-black/5"
        >
          <span>{p.title}</span>
          <span className="text-xs text-black/40">{p.brand?.name}</span>
        </button>
      ))}
    </div>
  )}
</div>

              <div className="mt-6">
                {section.items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-black/10 px-4 py-6 text-sm text-black/50">
                    No products assigned yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                    {section.items.map((item) => (
                      <article
                        key={item.id}
                        className="overflow-hidden rounded-2xl border border-black/10 bg-white"
                      >
                        <div className="aspect-[4/5] bg-black/5">
                          {item.product.imageUrl ? (
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.title}
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
                              Position {item.position}
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] ${
                                item.product.status === "APPROVED"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-black/10 bg-black/5 text-black/60"
                              }`}
                            >
                              {item.product.status.replaceAll("_", " ")}
                            </span>
                          </div>

                          <div>
                            <div className="font-medium leading-tight">
                              {item.product.title}
                            </div>
                            <div className="mt-1 text-xs text-black/50">
                              {item.product.brand.name}
                            </div>
                            <div className="mt-1 text-xs text-black/40">
                              {item.product.slug}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 text-[11px] text-black/60">
                            <span className="rounded-full border border-black/10 px-2 py-1">
                              {item.product.isActive ? "Active" : "Inactive"}
                            </span>

                            <span className="rounded-full border border-black/10 px-2 py-1">
                              {item.product.publishedAt ? "Published" : "Draft"}
                            </span>

                            <span className="rounded-full border border-black/10 px-2 py-1">
                              {item.product.price
                                ? `${item.product.price} ${item.product.currency}`
                                : "No price"}
                            </span>
                          </div>

                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => moveItem(section.id, item.position, "up")}
                              className="text-xs"
                            >
                              ↑
                            </button>

                            <button
                              onClick={() => moveItem(section.id, item.position, "down")}
                              className="text-xs"
                            >
                              ↓
                            </button>

                            <button
                              onClick={() => removeProduct(section.id, item.id)}
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

              <div className="mt-4 flex gap-3">
  <button
    onClick={() => saveSection(section)}
    disabled={saving === section.id}
    className="rounded-lg border border-black/10 px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-50"
  >
    {saving === section.id ? "Saving..." : "Save section"}
  </button>

  <button
    onClick={() => deleteSection(section)}
    disabled={saving === section.id}
    className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
  >
    Delete section
  </button>
</div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}