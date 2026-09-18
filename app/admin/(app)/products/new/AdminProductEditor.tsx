"use client";

import { useEffect, useMemo, useState } from "react";
import { PRODUCT_TYPES } from "@/lib/taxonomy/productTypes";
import Image from "next/image";
import { useRouter } from "next/navigation";


type BrandOption = {
  id: string;
  name: string;
  slug: string;
};

type Currency = "GBP" | "EUR" | "CHF" | "USD";
type TaxItem = {
  id: string;
  name: string;
  slug: string;
};

const GARMENT_LENGTHS = [
  "50",
  "52",
  "54",
  "56",
  "58",
  "60",
  "62",
] as const;

const ACCESSORY_COLOUR_SLUGS = [
  "gold",
  "silver",
  "rose-gold",
  "platinum",
  "pearl",
  "black",
];

function formatProductTypeLabel(value: string) {
  if (value === "COATS_JACKETS") return "Coats & Jackets";
  if (value === "HOODIE_SWEATSHIRT") return "Hoodie & Sweatshirt";
  if (value === "T_SHIRT") return "T-Shirt";

  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function fetchTaxonomy(path: string): Promise<TaxItem[]> {
  const response = await fetch(path, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data?.error ?? `Failed to load taxonomy (${response.status})`);
  }

  return Array.isArray(data.items) ? data.items : [];
}

function filterAccessoryColours(items: TaxItem[]) {
  return items.filter((item) =>
    ACCESSORY_COLOUR_SLUGS.includes(item.slug)
  );
}

function SectionCard({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-black/10 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:p-6">
      {children}
    </section>
  );
}

function FieldLabel({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
      {children}
      {required ? <span className="ml-1 text-[#7B2D3E]">*</span> : null}
    </label>
  );
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3.5 py-1.5 text-xs transition",
        active
          ? "border-[#7B2D3E] bg-[#7B2D3E] text-white shadow-sm"
          : "border-black/10 bg-white text-neutral-700 hover:bg-[#fdf7f4]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}



export default function AdminProductEditor() {
  const router = useRouter();
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [brandsError, setBrandsError] = useState<string | null>(null);

  const [brandId, setBrandId] = useState("");
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [currency, setCurrency] = useState<Currency>("GBP");

  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>([]);

const [materials, setMaterials] = useState<TaxItem[]>([]);
const [occasions, setOccasions] = useState<TaxItem[]>([]);
const [styles, setStyles] = useState<TaxItem[]>([]);
const [colours, setColours] = useState<TaxItem[]>([]);
const [sizes, setSizes] = useState<TaxItem[]>([]);
const [accessoryCategories, setAccessoryCategories] = useState<TaxItem[]>([]);

const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
const [selectedOccasionIds, setSelectedOccasionIds] = useState<string[]>([]);
const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([]);
const [selectedColourIds, setSelectedColourIds] = useState<string[]>([]);
const [selectedSizeIds, setSelectedSizeIds] = useState<string[]>([]);
const [selectedLengths, setSelectedLengths] = useState<string[]>([]);

const [categoryId, setCategoryId] = useState<string | null>(null);
const [polyesterFree, setPolyesterFree] = useState(false);
const [saleBadge, setSaleBadge] = useState(false);

const [taxonomyLoading, setTaxonomyLoading] = useState(false);
const [taxonomyError, setTaxonomyError] = useState<string | null>(null);

const [images, setImages] = useState<string[]>([]);
const [imageDraft, setImageDraft] = useState("");
const [imageError, setImageError] = useState<string | null>(null);
const [saving, setSaving] = useState(false);
const [saveError, setSaveError] = useState<string | null>(null);

function addImage() {
  const value = imageDraft.trim();

  if (!value) return;

  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }
  } catch {
    setImageError("Enter a valid http or https image URL.");
    return;
  }

  if (images.includes(value)) {
    setImageError("This image has already been added.");
    return;
  }

  setImages((current) => [...current, value]);
  setImageDraft("");
  setImageError(null);
}

function removeImage(index: number) {
  setImages((current) =>
    current.filter((_, currentIndex) => currentIndex !== index)
  );
}

function moveImage(index: number, direction: "up" | "down") {
  setImages((current) => {
    const nextIndex =
      direction === "up"
        ? index - 1
        : index + 1;

    if (nextIndex < 0 || nextIndex >= current.length) {
      return current;
    }

    const next = [...current];

    [next[index], next[nextIndex]] = [
      next[nextIndex],
      next[index],
    ];

    return next;
  });
}

function toggleSelected(
  setter: React.Dispatch<React.SetStateAction<string[]>>,
  current: string[],
  value: string
) {
  setter(
    current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]
  );
}

  useEffect(() => {
    async function loadBrands() {
      setBrandsLoading(true);
      setBrandsError(null);

      try {
        const response = await fetch("/api/admin/brands");
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.ok) {
          throw new Error(data?.error ?? "Failed to load brands");
        }

        setBrands(data.brands ?? []);
      } catch (error) {
        setBrandsError(
          error instanceof Error ? error.message : "Failed to load brands"
        );
      } finally {
        setBrandsLoading(false);
      }
    }

    void loadBrands();
  }, []);

  const selectedBrand = useMemo(
    () => brands.find((brand) => brand.id === brandId) ?? null,
    [brands, brandId]
  );

  useEffect(() => {
  async function loadGlobalTaxonomy() {
    setTaxonomyError(null);

    try {
      const [occasionItems, colourItems, sizeItems] = await Promise.all([
  fetchTaxonomy("/api/admin/taxonomy?type=occasions"),
  fetchTaxonomy("/api/admin/taxonomy?type=colours"),
  fetchTaxonomy("/api/admin/taxonomy?type=sizes"),
]);

      setOccasions(occasionItems);
      setColours(colourItems);
      setSizes(sizeItems);
    } catch (error) {
      setTaxonomyError(
        error instanceof Error ? error.message : "Failed to load taxonomy"
      );
    }
  }

  void loadGlobalTaxonomy();
}, []);

useEffect(() => {
  if (!selectedProductTypes.length) {
    setMaterials([]);
    setStyles([]);
    setAccessoryCategories([]);

    setSelectedMaterialIds([]);
    setSelectedStyleIds([]);

    setCategoryId(null);

    return;
  }

  async function loadProductTypeTaxonomy() {
    setTaxonomyLoading(true);
    setTaxonomyError(null);

    try {
      const [materialGroups, styleGroups, accessoryItems, colourItems] =
        await Promise.all([
          Promise.all(
            selectedProductTypes.map((productType) =>
              fetchTaxonomy(
  `/api/admin/taxonomy?type=materials&productType=${encodeURIComponent(
    productType
  )}`
)
            )
          ),

          Promise.all(
            selectedProductTypes.map((productType) =>
              fetchTaxonomy(
  `/api/admin/taxonomy?type=styles&productType=${encodeURIComponent(
    productType
  )}`
)
            )
          ),

          selectedProductTypes.includes("ACCESSORIES")
            ? fetchTaxonomy(
  "/api/admin/taxonomy?type=categories&parent=accessories"
)
            : Promise.resolve([]),

          fetchTaxonomy("/api/admin/taxonomy?type=colours"),
        ]);

      const materialMap = new Map<string, TaxItem>();

      materialGroups.flat().forEach((item) => {
        materialMap.set(item.id, item);
      });

      const nextMaterials = Array.from(materialMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      const styleMap = new Map<string, TaxItem>();

      styleGroups.flat().forEach((item) => {
        styleMap.set(item.id, item);
      });

      const nextStyles = Array.from(styleMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      const nextColours = selectedProductTypes.includes("ACCESSORIES")
        ? filterAccessoryColours(colourItems)
        : colourItems;

      setMaterials(nextMaterials);
      setStyles(nextStyles);
      setAccessoryCategories(accessoryItems);
      setColours(nextColours);

      setSelectedMaterialIds((current) =>
        current.filter((id) =>
          nextMaterials.some((material) => material.id === id)
        )
      );

      setSelectedStyleIds((current) =>
        current.filter((id) =>
          nextStyles.some((style) => style.id === id)
        )
      );

      setSelectedColourIds((current) =>
        current.filter((id) =>
          nextColours.some((colour) => colour.id === id)
        )
      );

      if (selectedProductTypes.includes("ACCESSORIES")) {
        setSelectedSizeIds([]);
        setSelectedMaterialIds([]);
      } else {
        setCategoryId(null);
      }
    } catch (error) {
      setTaxonomyError(
        error instanceof Error
          ? error.message
          : "Failed to load product taxonomy"
      );
    } finally {
      setTaxonomyLoading(false);
    }

    function addImage() {
  const value = imageDraft.trim();

  if (!value) return;

  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error();
    }
  } catch {
    setImageError("Enter a valid http or https image URL.");
    return;
  }

  if (images.includes(value)) {
    setImageError("This image has already been added.");
    return;
  }

  setImages((current) => [...current, value]);
  setImageDraft("");
  setImageError(null);
}

function removeImage(index: number) {
  setImages((current) => current.filter((_, i) => i !== index));
}

function moveImage(index: number, direction: "up" | "down") {
  setImages((current) => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;

    if (nextIndex < 0 || nextIndex >= current.length) {
      return current;
    }

    const next = [...current];

    [next[index], next[nextIndex]] = [
      next[nextIndex],
      next[index],
    ];

    return next;
  });
}
  }

  void loadProductTypeTaxonomy();
}, [selectedProductTypes]);

async function saveProduct() {
  if (saving) return;

  setSaveError(null);

  if (!brandId) {
    setSaveError("Select a brand.");
    return;
  }

  if (!title.trim()) {
    setSaveError("Enter a product name.");
    return;
  }

  if (!sourceUrl.trim()) {
    setSaveError("Enter the product URL.");
    return;
  }

  if (selectedProductTypes.length === 0) {
    setSaveError("Select at least one product type.");
    return;
  }

  setSaving(true);

  try {
    const response = await fetch("/api/admin/products/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        brandId,
        title: title.trim(),

        sourceUrl: sourceUrl.trim(),
        affiliateUrl: affiliateUrl.trim(),

        price: price.trim(),
        originalPrice: originalPrice.trim(),
        currency,

        productTypes: selectedProductTypes,

        categoryId,

        materialIds: selectedMaterialIds,
        occasionIds: selectedOccasionIds,
        styleIds: selectedStyleIds,
        colourIds: selectedColourIds,
        sizeIds: selectedSizeIds,

        lengths: selectedLengths,

        polyesterFree,
        saleBadge,

        images,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.ok) {
      throw new Error(
        data?.error ?? `Failed to create product (${response.status})`
      );
    }

    router.push("/admin/products");
    router.refresh();
  } catch (error) {
    setSaveError(
      error instanceof Error
        ? error.message
        : "Failed to create product."
    );
  } finally {
    setSaving(false);
  }
}

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <SectionCard>
          <div>
            <h2 className="text-lg font-semibold text-black">
              Product details
            </h2>

            <p className="mt-1 text-sm leading-6 text-neutral-500">
              Add the core information for this product.
            </p>
          </div>

          <div className="mt-6 space-y-5">
  {brandsError ? (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {brandsError}
    </div>
  ) : null}

  <div>
    <FieldLabel required>Brand</FieldLabel>

    <select
      value={brandId}
      onChange={(e) => setBrandId(e.target.value)}
      disabled={brandsLoading}
      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5 disabled:bg-neutral-50 disabled:text-neutral-400"
    >
      <option value="">
        {brandsLoading ? "Loading brands..." : "Select a brand"}
      </option>

      {brands.map((brand) => (
        <option key={brand.id} value={brand.id}>
          {brand.name}
        </option>
      ))}
    </select>

    {selectedBrand ? (
      <div className="mt-2 text-xs text-neutral-400">
        Brand slug: {selectedBrand.slug}
      </div>
    ) : null}
  </div>

  <div>
    <FieldLabel required>Product name</FieldLabel>

    <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      placeholder="e.g. Satin Draped Maxi Dress"
      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
    />
  </div>

  <div className="grid gap-5 md:grid-cols-2">
    <div>
      <FieldLabel required>Product URL</FieldLabel>

      <input
        type="url"
        value={sourceUrl}
        onChange={(e) => setSourceUrl(e.target.value)}
        placeholder="https://brand.com/products/..."
        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
      />

      <div className="mt-2 text-xs leading-5 text-neutral-400">
        Original product page on the brand website.
      </div>
    </div>

    <div>
      <FieldLabel>Affiliate URL</FieldLabel>

      <input
        type="url"
        value={affiliateUrl}
        onChange={(e) => setAffiliateUrl(e.target.value)}
        placeholder="https://..."
        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
      />

      <div className="mt-2 text-xs leading-5 text-neutral-400">
        Optional now. An affiliate link will be required before publishing.
      </div>
    </div>
  </div>

 <div className="grid gap-5 sm:grid-cols-3">
  <div>
    <FieldLabel>Current price</FieldLabel>

    <input
      type="number"
      min="0"
      step="0.01"
      value={price}
      onChange={(e) => setPrice(e.target.value)}
      placeholder="72.00"
      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
    />

    <div className="mt-2 text-xs leading-5 text-neutral-400">
      Current selling price.
    </div>
  </div>

  <div>
    <FieldLabel>Original price</FieldLabel>

    <input
      type="number"
      min="0"
      step="0.01"
      value={originalPrice}
      onChange={(e) => setOriginalPrice(e.target.value)}
      placeholder="90.00"
      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
    />

    <div className="mt-2 text-xs leading-5 text-neutral-400">
      Optional. Price before discount.
    </div>
  </div>

  <div>
    <FieldLabel>Currency</FieldLabel>

    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value as Currency)}
      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
    >
      <option value="GBP">GBP</option>
      <option value="EUR">EUR</option>
      <option value="CHF">CHF</option>
      <option value="USD">USD</option>
    </select>
  </div>
</div>
</div>
        </SectionCard>

        <SectionCard>
          <div>
            <h2 className="text-lg font-semibold text-black">
              Classification
            </h2>

            <p className="mt-1 text-sm leading-6 text-neutral-500">
              Product type, materials, occasions, styles, colours and sizing.
            </p>
          </div>

          <div className="mt-6 space-y-8">
  {taxonomyError ? (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {taxonomyError}
    </div>
  ) : null}

  <div>
    <FieldLabel required>Product type</FieldLabel>

    <div className="flex flex-wrap gap-2">
      {PRODUCT_TYPES.map((productType) => (
        <Chip
          key={productType}
          active={selectedProductTypes.includes(productType)}
          onClick={() => {
            setSelectedProductTypes((current) =>
              current.includes(productType)
                ? current.filter((item) => item !== productType)
                : [...current, productType]
            );
          }}
        >
          {formatProductTypeLabel(productType)}
        </Chip>
      ))}
    </div>
  </div>

  {selectedProductTypes.includes("ACCESSORIES") ? (
    <div>
      <FieldLabel>Accessory category</FieldLabel>

      {accessoryCategories.length ? (
        <div className="flex flex-wrap gap-2">
          {accessoryCategories.map((category) => (
            <Chip
              key={category.id}
              active={categoryId === category.id}
              onClick={() =>
                setCategoryId((current) =>
                  current === category.id ? null : category.id
                )
              }
            >
              {category.name}
            </Chip>
          ))}
        </div>
      ) : (
        <div className="text-sm text-neutral-400">
          {taxonomyLoading
            ? "Loading accessory categories..."
            : "No accessory categories available."}
        </div>
      )}
    </div>
  ) : null}

  {!selectedProductTypes.includes("ACCESSORIES") ? (
    <div>
      <FieldLabel>Materials</FieldLabel>

      {!selectedProductTypes.length ? (
        <div className="text-sm text-neutral-400">
          Select a product type first.
        </div>
      ) : materials.length ? (
        <div className="flex flex-wrap gap-2">
          {materials.map((material) => (
            <Chip
              key={material.id}
              active={selectedMaterialIds.includes(material.id)}
              onClick={() =>
                toggleSelected(
                  setSelectedMaterialIds,
                  selectedMaterialIds,
                  material.id
                )
              }
            >
              {material.name}
            </Chip>
          ))}
        </div>
      ) : (
        <div className="text-sm text-neutral-400">
          {taxonomyLoading
            ? "Loading materials..."
            : "No materials available for this product type."}
        </div>
      )}
    </div>
  ) : null}

  <div>
    <FieldLabel>Occasions</FieldLabel>

    <div className="flex flex-wrap gap-2">
      {occasions.map((occasion) => (
        <Chip
          key={occasion.id}
          active={selectedOccasionIds.includes(occasion.id)}
          onClick={() =>
            toggleSelected(
              setSelectedOccasionIds,
              selectedOccasionIds,
              occasion.id
            )
          }
        >
          {occasion.name}
        </Chip>
      ))}
    </div>
  </div>

  <div>
    <FieldLabel>Styles</FieldLabel>

    {!selectedProductTypes.length ? (
      <div className="text-sm text-neutral-400">
        Select a product type first.
      </div>
    ) : styles.length ? (
      <div className="flex flex-wrap gap-2">
        {styles.map((style) => (
          <Chip
            key={style.id}
            active={selectedStyleIds.includes(style.id)}
            onClick={() =>
              toggleSelected(
                setSelectedStyleIds,
                selectedStyleIds,
                style.id
              )
            }
          >
            {style.name}
          </Chip>
        ))}
      </div>
    ) : (
      <div className="text-sm text-neutral-400">
        {taxonomyLoading
          ? "Loading styles..."
          : "No styles available for this product type."}
      </div>
    )}
  </div>

  <div>
    <FieldLabel>Colours</FieldLabel>

    <div className="flex flex-wrap gap-2">
      {colours.map((colour) => (
        <Chip
          key={colour.id}
          active={selectedColourIds.includes(colour.id)}
          onClick={() =>
            toggleSelected(
              setSelectedColourIds,
              selectedColourIds,
              colour.id
            )
          }
        >
          {colour.name}
        </Chip>
      ))}
    </div>
  </div>

  {!selectedProductTypes.includes("ACCESSORIES") ? (
    <div>
      <FieldLabel>Sizes</FieldLabel>

      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <Chip
            key={size.id}
            active={selectedSizeIds.includes(size.id)}
            onClick={() =>
              toggleSelected(
                setSelectedSizeIds,
                selectedSizeIds,
                size.id
              )
            }
          >
            {size.name}
          </Chip>
        ))}
      </div>
    </div>
  ) : null}

  {selectedProductTypes.some(
    (productType) =>
      productType === "DRESS" || productType === "ABAYA"
  ) ? (
    <div>
      <FieldLabel>Garment lengths</FieldLabel>

      <div className="flex flex-wrap gap-2">
        {GARMENT_LENGTHS.map((length) => (
          <Chip
            key={length}
            active={selectedLengths.includes(length)}
            onClick={() =>
              toggleSelected(
                setSelectedLengths,
                selectedLengths,
                length
              )
            }
          >
            {length}&quot;
          </Chip>
        ))}
      </div>
    </div>
  ) : null}

  <div className="grid gap-4 md:grid-cols-2">
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-black/10 bg-neutral-50 px-4 py-4">
      <div>
        <div className="text-sm font-medium text-black">
          Polyester-free
        </div>

        <div className="mt-1 text-xs leading-5 text-neutral-500">
          Product contains no polyester.
        </div>
      </div>

      <input
        type="checkbox"
        checked={polyesterFree}
        onChange={(e) => setPolyesterFree(e.target.checked)}
      />
    </label>

    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-black/10 bg-neutral-50 px-4 py-4">
      <div>
        <div className="text-sm font-medium text-black">
          Sale
        </div>

        <div className="mt-1 text-xs leading-5 text-neutral-500">
          Add the Sale badge to this product.
        </div>
      </div>

      <input
        type="checkbox"
        checked={saleBadge}
        onChange={(e) => setSaleBadge(e.target.checked)}
      />
    </label>
  </div>
</div>
        </SectionCard> 

        <SectionCard>
          <div>
            <h2 className="text-lg font-semibold text-black">
              Product images
            </h2>

            <p className="mt-1 text-sm leading-6 text-neutral-500">
              Add and order the images shown on Veilora.
            </p>
          </div>

          <div className="mt-6 space-y-5">
  <div>
    <FieldLabel>Image URL</FieldLabel>

    <div className="flex flex-col gap-3 sm:flex-row">
      <input
        type="url"
        value={imageDraft}
        onChange={(e) => {
          setImageDraft(e.target.value);

          if (imageError) {
            setImageError(null);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addImage();
          }
        }}
        placeholder="https://..."
        className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
      />

      <button
        type="button"
        onClick={addImage}
        className="inline-flex items-center justify-center rounded-2xl bg-[#7B2D3E] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#6a2435]"
      >
        Add image
      </button>
    </div>

    <div className="mt-2 text-xs leading-5 text-neutral-400">
      Add product image URLs in display order. The first image will be the
      primary image.
    </div>

    {imageError ? (
      <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {imageError}
      </div>
    ) : null}
  </div>

  {images.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-black/10 bg-neutral-50 px-5 py-10 text-center">
      <div className="text-sm font-medium text-neutral-600">
        No images added
      </div>

      <div className="mt-1 text-xs text-neutral-400">
        Add at least one product image before publishing.
      </div>
    </div>
  ) : (
    <div className="space-y-3">
      {images.map((url, index) => (
        <div
          key={`${url}-${index}`}
          className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-neutral-50 p-3 sm:flex-row sm:items-center"
        >
          <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-white">
            <Image
              src={url}
              alt={`Product image ${index + 1}`}
              fill
              sizes="96px"
              className="object-contain p-1"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-black">
                Image {index + 1}
              </span>

              {index === 0 ? (
                <span className="rounded-full border border-[#7B2D3E]/20 bg-[#fdf7f4] px-2.5 py-1 text-[11px] font-medium text-[#7B2D3E]">
                  Primary
                </span>
              ) : null}
            </div>

            <div className="mt-2 truncate text-xs text-neutral-400">
              {url}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveImage(index, "up")}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-30"
              >
                Move up
              </button>

              <button
                type="button"
                disabled={index === images.length - 1}
                onClick={() => moveImage(index, "down")}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-30"
              >
                Move down
              </button>

              <button
                type="button"
                onClick={() => removeImage(index)}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
        </SectionCard>
      </div>

      <div className="space-y-6">
        <SectionCard>
          <div>
            <h2 className="text-lg font-semibold text-black">
              Listing
            </h2>

            <p className="mt-1 text-sm leading-6 text-neutral-500">
              The product will initially be saved as a draft.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3">
              <span className="text-sm text-neutral-500">Status</span>

              <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-neutral-700">
                Draft
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3">
              <span className="text-sm text-neutral-500">Visibility</span>

              <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-neutral-700">
                Unpublished
              </span>
            </div>
          </div>

          {saveError ? (
  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    {saveError}
  </div>
) : null}

          <button
  type="button"
  onClick={saveProduct}
  disabled={saving}
  className="inline-flex items-center justify-center rounded-2xl bg-[#7B2D3E] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#6a2435] disabled:cursor-not-allowed disabled:opacity-50"
>
  {saving ? "Saving..." : "Save product"}
</button>
        </SectionCard>
      </div>
    </div>
  );
}