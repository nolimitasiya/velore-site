"use client";

import { useEffect, useMemo, useState } from "react";
import { PRODUCT_TYPES } from "@/lib/taxonomy/productTypes";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BRAND_CURRENCY_OPTIONS,
  isAllowedBrandCurrency,
  normalizeCurrencyCode,
} from "@/lib/currency/codes";

type AdminProductEditorProps =
  | {
      mode?: "create";
      productId?: never;
    }
  | {
      mode: "edit";
      productId: string;
    };

type BrandOption = {
  id: string;
  name: string;
  slug: string;
};

type Currency = string;
type ProductSpecificationDraft = {
  id: string;
  label: string;
  value: string;
};
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



export default function AdminProductEditor({
  mode = "create",
  productId,
}: AdminProductEditorProps) {
  const isEditMode = mode === "edit";
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
  const [description, setDescription] = useState("");
  const [colourDescription, setColourDescription] = useState("");
  const [careInstructions, setCareInstructions] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("");
  const [transparency, setTransparency] = useState("");
  const [liningStatus, setLiningStatus] = useState("");

const [specifications, setSpecifications] = useState<
  ProductSpecificationDraft[]
>([]);

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
const [editLoading, setEditLoading] = useState(isEditMode);
const [editLoadError, setEditLoadError] = useState<string | null>(null);

function addSpecification() {
  setSpecifications((current) => [
    ...current,
    {
      id: crypto.randomUUID(),
      label: "",
      value: "",
    },
  ]);
}

function updateSpecification(
  id: string,
  field: "label" | "value",
  value: string
) {
  setSpecifications((current) =>
    current.map((specification) =>
      specification.id === id
        ? { ...specification, [field]: value }
        : specification
    )
  );
}

function removeSpecification(id: string) {
  setSpecifications((current) =>
    current.filter((specification) => specification.id !== id)
  );
}

function moveSpecification(
  index: number,
  direction: "up" | "down"
) {
  setSpecifications((current) => {
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

  useEffect(() => {
  if (!isEditMode || !productId) {
    return;
  }

  const currentProductId = productId;
  let cancelled = false;

  async function loadProduct() {
    setEditLoading(true);
    setEditLoadError(null);

    try {
      const response = await fetch(
  `/api/admin/products/${encodeURIComponent(currentProductId)}`,
  {
    cache: "no-store",
  }
);

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok || !data.product) {
        throw new Error(
          data?.error ?? "Failed to load product."
        );
      }

      if (cancelled) {
        return;
      }

      const product = data.product;
      setBrandId(
  typeof product.brandId === "string"
    ? product.brandId
    : ""
);

      setTitle(product.title ?? "");
      setSourceUrl(product.sourceUrl ?? "");
      setAffiliateUrl(product.affiliateUrl ?? "");
      setDescription(product.description ?? "");
      setColourDescription(product.colourDescription ?? "");
      setCareInstructions(product.careInstructions ?? "");
      setCountryOfOrigin(product.countryOfOrigin ?? "");
      setTransparency(product.transparency ?? "");
      setLiningStatus(product.liningStatus ?? "");

setSpecifications(
  Array.isArray(product.specifications)
    ? product.specifications
        .filter(
          (specification: unknown): specification is {
            id: string;
            label: string;
            value: string;
          } =>
            typeof specification === "object" &&
            specification !== null &&
            "id" in specification &&
            typeof specification.id === "string" &&
            "label" in specification &&
            typeof specification.label === "string" &&
            "value" in specification &&
            typeof specification.value === "string"
        )
        .map((specification: ProductSpecificationDraft) => ({
          id: specification.id,
          label: specification.label,
          value: specification.value,
        }))
    : []
);

      setPrice(
        product.price === null || product.price === undefined
          ? ""
          : String(product.price)
      );

      setOriginalPrice(
        product.originalPrice === null ||
          product.originalPrice === undefined
          ? ""
          : String(product.originalPrice)
      );

      const loadedCurrency = normalizeCurrencyCode(product.currency);
      setCurrency(
      isAllowedBrandCurrency(loadedCurrency)
      ? loadedCurrency
      : "GBP"
    );

      setSelectedProductTypes(
        Array.isArray(product.productTypes)
          ? product.productTypes
          : []
      );

      setSelectedMaterialIds(
        Array.isArray(product.materialIds)
          ? product.materialIds
          : []
      );

      setSelectedOccasionIds(
        Array.isArray(product.occasionIds)
          ? product.occasionIds
          : []
      );

      setSelectedStyleIds(
        Array.isArray(product.styleIds)
          ? product.styleIds
          : []
      );

      setSelectedColourIds(
        Array.isArray(product.colourIds)
          ? product.colourIds
          : []
      );

      setSelectedSizeIds(
        Array.isArray(product.sizeIds)
          ? product.sizeIds
          : []
      );

      setSelectedLengths(
        Array.isArray(product.lengths)
          ? product.lengths
          : []
      );

      setCategoryId(
        typeof product.categoryId === "string"
          ? product.categoryId
          : null
      );

      setPolyesterFree(product.polyesterFree === true);

      setSaleBadge(
        Array.isArray(product.badges) &&
          product.badges.includes("sale")
      );

      setImages(
        Array.isArray(product.images)
          ? product.images
              .map((image: unknown) => {
                if (
                  image &&
                  typeof image === "object" &&
                  "url" in image &&
                  typeof image.url === "string"
                ) {
                  return image.url;
                }

                return null;
              })
              .filter(
                (url: string | null): url is string =>
                  url !== null
              )
          : []
      );
    } catch (error) {
      if (!cancelled) {
        setEditLoadError(
          error instanceof Error
            ? error.message
            : "Failed to load product."
        );
      }
    } finally {
      if (!cancelled) {
        setEditLoading(false);
      }
    }
  }

  void loadProduct();

  return () => {
    cancelled = true;
  };
}, [isEditMode, productId]);

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

// Ignore specification rows where both fields are empty.
const validSpecifications = specifications
  .map((specification) => ({
    label: specification.label.trim(),
    value: specification.value.trim(),
  }))
  .filter(
    (specification) =>
      specification.label !== "" || specification.value !== ""
  );

// Prevent incomplete specification rows.
const incompleteSpecification = validSpecifications.find(
  (specification) =>
    specification.label === "" || specification.value === ""
);

if (incompleteSpecification) {
  setSaveError(
    "Each specification must have both a label and a value."
  );
  return;
}

// Prevent duplicate labels, regardless of capitalisation.
const specificationLabels = validSpecifications.map(
  (specification) => specification.label.toLowerCase()
);

if (
  new Set(specificationLabels).size !==
  specificationLabels.length
) {
  setSaveError(
    "Specification labels must be unique. Please remove duplicate labels."
  );
  return;
}

// Enforce the maximum number of specifications.
if (validSpecifications.length > 50) {
  setSaveError("A product can have a maximum of 50 specifications.");
  return;
}

setSaving(true);

  try {
    const endpoint =
  isEditMode && productId
    ? `/api/admin/products/${encodeURIComponent(productId)}`
    : "/api/admin/products/create";

const response = await fetch(endpoint, {
  method: isEditMode ? "PATCH" : "POST",
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
        description,
        colourDescription,
        careInstructions,
        countryOfOrigin,
        transparency,
        liningStatus,
        specifications: validSpecifications.map((specification, index) => ({
          label: specification.label,
          value: specification.value,
         sortOrder: index,
        })),

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
    data?.error ??
      `Failed to ${isEditMode ? "update" : "create"} product (${response.status})`
  );
}

    router.push("/admin/products");
    router.refresh();
  } catch (error) {
    setSaveError(
      error instanceof Error
        ? error.message
        : isEditMode
  ? "Failed to update product."
  : "Failed to create product."
    );
  } finally {
    setSaving(false);
  }
}

if (isEditMode && editLoading) {
  return (
    <SectionCard>
      <div className="py-12 text-center">
        <div className="text-sm font-medium text-neutral-700">
          Loading product…
        </div>

        <div className="mt-1 text-xs text-neutral-400">
          Loading the existing catalogue information.
        </div>
      </div>
    </SectionCard>
  );
}

if (isEditMode && editLoadError) {
  return (
    <SectionCard>
      <div className="py-8">
        <div className="text-sm font-semibold text-red-700">
          Unable to load product
        </div>

        <div className="mt-2 text-sm leading-6 text-neutral-500">
          {editLoadError}
        </div>

        <button
          type="button"
          onClick={() => router.refresh()}
          className="mt-5 inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          Try again
        </button>
      </div>
    </SectionCard>
  );
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
      disabled={brandsLoading || isEditMode}
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

    {isEditMode ? (
  <div className="mt-2 text-xs leading-5 text-neutral-400">
    Brand assignment is fixed for existing products.
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
  onChange={(e) => setCurrency(e.target.value)}
  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
>
  {BRAND_CURRENCY_OPTIONS.map((option) => (
    <option key={option.code} value={option.code}>
      {option.label}
    </option>
  ))}
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
      Product Description &amp; Specifications
    </h2>

    <p className="mt-1 text-sm leading-6 text-neutral-500">
      Add optional garment information for shoppers. Empty fields will not
      appear on the product page.
    </p>
  </div>

  <div className="mt-6 space-y-6">
    <div>
      <FieldLabel>Description</FieldLabel>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={10000}
        rows={5}
        placeholder="Describe the garment, silhouette, fabric feel and key design details."
        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
      />
    </div>

    <div className="grid gap-5 md:grid-cols-2">
      <div>
        <FieldLabel>Colour description</FieldLabel>

        <input
          type="text"
          value={colourDescription}
          onChange={(e) => setColourDescription(e.target.value)}
          maxLength={500}
          placeholder="e.g. Soft ivory with champagne undertones"
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
        />
      </div>

      <div>
        <FieldLabel>Country of origin</FieldLabel>

        <input
          type="text"
          value={countryOfOrigin}
          onChange={(e) => setCountryOfOrigin(e.target.value)}
          maxLength={250}
          placeholder="e.g. Made in Türkiye"
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
        />
      </div>
    </div>

    <div>
      <FieldLabel>Care instructions</FieldLabel>

      <textarea
        value={careInstructions}
        onChange={(e) => setCareInstructions(e.target.value)}
        maxLength={5000}
        rows={3}
        placeholder="e.g. Hand wash cold. Do not tumble dry."
        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
      />
    </div>

    <div className="grid gap-5 md:grid-cols-2">
      <div>
        <FieldLabel>Transparency</FieldLabel>

        <select
          value={
            ["", "Opaque", "Semi-sheer", "Sheer"].includes(transparency)
              ? transparency
              : "__custom__"
          }
          onChange={(e) =>
            setTransparency(
              e.target.value === "__custom__" ? " " : e.target.value
            )
          }
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
        >
          <option value="">Not specified</option>
          <option value="Opaque">Opaque</option>
          <option value="Semi-sheer">Semi-sheer</option>
          <option value="Sheer">Sheer</option>
          <option value="__custom__">Custom</option>
        </select>

        {!["", "Opaque", "Semi-sheer", "Sheer"].includes(transparency) ? (
          <input
            type="text"
            value={transparency}
            onChange={(e) => setTransparency(e.target.value)}
            maxLength={250}
            placeholder="Enter custom transparency"
            className="mt-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
          />
        ) : null}
      </div>

      <div>
        <FieldLabel>Lining</FieldLabel>

        <select
          value={
            ["", "Fully lined", "Partially lined", "Unlined"].includes(
              liningStatus
            )
              ? liningStatus
              : "__custom__"
          }
          onChange={(e) =>
            setLiningStatus(
              e.target.value === "__custom__" ? " " : e.target.value
            )
          }
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
        >
          <option value="">Not specified</option>
          <option value="Fully lined">Fully lined</option>
          <option value="Partially lined">Partially lined</option>
          <option value="Unlined">Unlined</option>
          <option value="__custom__">Custom</option>
        </select>

        {!["", "Fully lined", "Partially lined", "Unlined"].includes(
          liningStatus
        ) ? (
          <input
            type="text"
            value={liningStatus}
            onChange={(e) => setLiningStatus(e.target.value)}
            maxLength={250}
            placeholder="Enter custom lining status"
            className="mt-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
          />
        ) : null}
      </div>
    </div>
  </div>
  <div className="mt-8 border-t border-black/10 pt-6">
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div>
      <h3 className="text-sm font-semibold text-black">
        Additional specifications
      </h3>

      <p className="mt-1 text-xs leading-5 text-neutral-500">
        Add materials, lining, closures or other garment details.
        Specifications appear in the order shown here.
      </p>
    </div>

    <button
      type="button"
      onClick={addSpecification}
      disabled={specifications.length >= 50}
      className="rounded-2xl bg-[#7B2D3E] px-4 py-2.5 text-xs font-medium text-white transition hover:bg-[#6a2435] disabled:cursor-not-allowed disabled:opacity-50"
    >
      + Add specification
    </button>
  </div>

  {specifications.length === 0 ? (
    <div className="mt-5 rounded-2xl border border-dashed border-black/10 bg-neutral-50 px-5 py-8 text-center">
      <p className="text-sm text-neutral-500">
        No additional specifications added.
      </p>
    </div>
  ) : (
    <div className="mt-5 space-y-4">
      {specifications.map((specification, index) => (
        <div
          key={specification.id}
          className="rounded-2xl border border-black/10 bg-neutral-50 p-4"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Specification {index + 1}
            </span>

            <button
              type="button"
              onClick={() => removeSpecification(specification.id)}
              className="text-xs font-medium text-red-700 hover:underline"
            >
              Remove
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>Label</FieldLabel>

              <input
                type="text"
                list={`specification-labels-${specification.id}`}
                value={specification.label}
                onChange={(e) =>
                  updateSpecification(
                    specification.id,
                    "label",
                    e.target.value
                  )
                }
                maxLength={150}
                placeholder="e.g. Material I"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
              />

              <datalist id={`specification-labels-${specification.id}`}>
                <option value="Material I" />
                <option value="Material II" />
                <option value="Lining" />
                <option value="Outer Layer" />
                <option value="Shell" />
                <option value="Fabric" />
                <option value="Trim" />
                <option value="Embroidery" />
                <option value="Closure" />
              </datalist>
            </div>

            <div>
              <FieldLabel>Value</FieldLabel>

              <textarea
                value={specification.value}
                onChange={(e) =>
                  updateSpecification(
                    specification.id,
                    "value",
                    e.target.value
                  )
                }
                maxLength={5000}
                rows={2}
                placeholder="e.g. 100% cotton"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => moveSpecification(index, "up")}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-30"
            >
              Move up
            </button>

            <button
              type="button"
              disabled={index === specifications.length - 1}
              onClick={() => moveSpecification(index, "down")}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-30"
            >
              Move down
            </button>
          </div>
        </div>
      ))}
    </div>
  )}

  <p className="mt-4 text-xs leading-5 text-neutral-400">
    Each specification requires a unique label and a value.
    Maximum 50 specifications per product.
  </p>
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
  {saving
  ? "Saving..."
  : isEditMode
    ? "Save changes"
    : "Save product"}
</button>
        </SectionCard>
      </div>
    </div>
  );
}