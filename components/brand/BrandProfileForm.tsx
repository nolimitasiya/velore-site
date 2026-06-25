// C:\Users\Asiya\projects\dalra\components\brand\BrandProfileForm.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CoverImagePositionEditor from "@/components/brand/CoverImagePositionEditor";

type ReturnsPaidBy = "BUYER" | "BRAND";

type ShippingTimeUnit =
  | "working days"
  | "days"
  | "weeks"
  | "business days"
  | "months";

const SHIPPING_TIME_UNITS: ShippingTimeUnit[] = [
  "working days",
  "days",
  "weeks",
  "business days",
  "months",
];

function parseShippingTimeframe(value?: string | null): {
  time: string;
  unit: ShippingTimeUnit;
} {
  const raw = (value ?? "").trim();

  if (!raw) return { time: "", unit: "working days" };

  const matchedUnit = SHIPPING_TIME_UNITS.find((unit) =>
    raw.toLowerCase().endsWith(unit.toLowerCase()),
  );

  if (!matchedUnit) return { time: raw, unit: "working days" };

  return {
    time: raw.slice(0, -matchedUnit.length).trim(),
    unit: matchedUnit,
  };
}

function buildShippingTimeframe(time: string, unit: ShippingTimeUnit) {
  const cleaned = time.trim();
  return cleaned ? `${cleaned} ${unit}` : "";
}

type CountryOption = { code: string; name: string };
type CountryGroup = { key: string; label: string; countries: CountryOption[] };

const COUNTRY_GROUPS: CountryGroup[] = [
  {
    key: "EUROPE",
    label: "Europe",
    countries: [
      { code: "AL", name: "Albania" },
      { code: "AD", name: "Andorra" },
      { code: "AT", name: "Austria" },
      { code: "BE", name: "Belgium" },
      { code: "BA", name: "Bosnia and Herzegovina" },
      { code: "BG", name: "Bulgaria" },
      { code: "HR", name: "Croatia" },
      { code: "CY", name: "Cyprus" },
      { code: "CZ", name: "Czechia" },
      { code: "DK", name: "Denmark" },
      { code: "EE", name: "Estonia" },
      { code: "FI", name: "Finland" },
      { code: "FR", name: "France" },
      { code: "DE", name: "Germany" },
      { code: "GR", name: "Greece" },
      { code: "HU", name: "Hungary" },
      { code: "IS", name: "Iceland" },
      { code: "IE", name: "Ireland" },
      { code: "IT", name: "Italy" },
      { code: "XK", name: "Kosovo" },
      { code: "LV", name: "Latvia" },
      { code: "LI", name: "Liechtenstein" },
      { code: "LT", name: "Lithuania" },
      { code: "LU", name: "Luxembourg" },
      { code: "MT", name: "Malta" },
      { code: "MD", name: "Moldova" },
      { code: "MC", name: "Monaco" },
      { code: "ME", name: "Montenegro" },
      { code: "NL", name: "Netherlands" },
      { code: "MK", name: "North Macedonia" },
      { code: "NO", name: "Norway" },
      { code: "PL", name: "Poland" },
      { code: "PT", name: "Portugal" },
      { code: "RO", name: "Romania" },
      { code: "SM", name: "San Marino" },
      { code: "RS", name: "Serbia" },
      { code: "SK", name: "Slovakia" },
      { code: "SI", name: "Slovenia" },
      { code: "ES", name: "Spain" },
      { code: "SE", name: "Sweden" },
      { code: "CH", name: "Switzerland" },
      { code: "TR", name: "Turkey" },
      { code: "UA", name: "Ukraine" },
      { code: "GB", name: "United Kingdom" },
      { code: "VA", name: "Vatican City" },
    ],
  },
  {
    key: "MIDDLE_EAST",
    label: "Middle East",
    countries: [
      { code: "BH", name: "Bahrain" },
      { code: "IR", name: "Iran" },
      { code: "IQ", name: "Iraq" },
      { code: "IL", name: "Israel" },
      { code: "JO", name: "Jordan" },
      { code: "KW", name: "Kuwait" },
      { code: "LB", name: "Lebanon" },
      { code: "OM", name: "Oman" },
      { code: "PS", name: "Palestine" },
      { code: "QA", name: "Qatar" },
      { code: "SA", name: "Saudi Arabia" },
      { code: "AE", name: "United Arab Emirates" },
      { code: "YE", name: "Yemen" },
    ],
  },
  {
    key: "ASIA",
    label: "Asia",
    countries: [
      { code: "AF", name: "Afghanistan" },
      { code: "BD", name: "Bangladesh" },
      { code: "BN", name: "Brunei" },
      { code: "KH", name: "Cambodia" },
      { code: "CN", name: "China" },
      { code: "HK", name: "Hong Kong" },
      { code: "IN", name: "India" },
      { code: "ID", name: "Indonesia" },
      { code: "JP", name: "Japan" },
      { code: "KZ", name: "Kazakhstan" },
      { code: "KG", name: "Kyrgyzstan" },
      { code: "MY", name: "Malaysia" },
      { code: "MV", name: "Maldives" },
      { code: "PK", name: "Pakistan" },
      { code: "PH", name: "Philippines" },
      { code: "SG", name: "Singapore" },
      { code: "KR", name: "South Korea" },
      { code: "LK", name: "Sri Lanka" },
      { code: "TW", name: "Taiwan" },
      { code: "TJ", name: "Tajikistan" },
      { code: "TH", name: "Thailand" },
      { code: "UZ", name: "Uzbekistan" },
      { code: "VN", name: "Vietnam" },
    ],
  },
  {
    key: "AFRICA",
    label: "Africa",
    countries: [
      { code: "DZ", name: "Algeria" },
      { code: "AO", name: "Angola" },
      { code: "BJ", name: "Benin" },
      { code: "BW", name: "Botswana" },
      { code: "CM", name: "Cameroon" },
      { code: "EG", name: "Egypt" },
      { code: "ET", name: "Ethiopia" },
      { code: "GH", name: "Ghana" },
      { code: "KE", name: "Kenya" },
      { code: "MA", name: "Morocco" },
      { code: "NG", name: "Nigeria" },
      { code: "RW", name: "Rwanda" },
      { code: "SN", name: "Senegal" },
      { code: "SO", name: "Somalia" },
      { code: "ZA", name: "South Africa" },
      { code: "SD", name: "Sudan" },
      { code: "TZ", name: "Tanzania" },
      { code: "TN", name: "Tunisia" },
      { code: "UG", name: "Uganda" },
      { code: "ZM", name: "Zambia" },
      { code: "ZW", name: "Zimbabwe" },
    ],
  },
  {
    key: "NORTH_AMERICA",
    label: "North America",
    countries: [
      { code: "CA", name: "Canada" },
      { code: "MX", name: "Mexico" },
      { code: "US", name: "United States" },
    ],
  },
  {
    key: "SOUTH_AMERICA",
    label: "South America",
    countries: [
      { code: "AR", name: "Argentina" },
      { code: "BO", name: "Bolivia" },
      { code: "BR", name: "Brazil" },
      { code: "CL", name: "Chile" },
      { code: "CO", name: "Colombia" },
      { code: "EC", name: "Ecuador" },
      { code: "GY", name: "Guyana" },
      { code: "PY", name: "Paraguay" },
      { code: "PE", name: "Peru" },
      { code: "SR", name: "Suriname" },
      { code: "UY", name: "Uruguay" },
      { code: "VE", name: "Venezuela" },
    ],
  },
  {
    key: "OCEANIA",
    label: "Oceania",
    countries: [
      { code: "AU", name: "Australia" },
      { code: "FJ", name: "Fiji" },
      { code: "NZ", name: "New Zealand" },
      { code: "PG", name: "Papua New Guinea" },
      { code: "WS", name: "Samoa" },
      { code: "TO", name: "Tonga" },
    ],
  },
];

const ALL_COUNTRY_CODES = new Set(
  COUNTRY_GROUPS.flatMap((group) =>
    group.countries.map((country) => country.code),
  ),
);

type Props = {
  initialName: string;
  initialSlug: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  initialInstagramHandle?: string | null;
  initialCoverImageUrl: string | null;
  initialCoverImageFocalX?: number | null;
  initialCoverImageFocalY?: number | null;
  initialShippingDomestic?: string | null;
  initialShippingInternational?: string | null;
  initialReturnWindowDays?: number | null;
  initialReturnsPaidBy?: ReturnsPaidBy | null;
  initialShippingCountryCodes?: string[] | null;
};

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-6 py-4">
        {eyebrow ? (
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
            {eyebrow}
          </div>
        ) : null}
        <h2 className="mt-0.5 text-md font-medium text-black">{title}</h2>
        {description && (
          <p className="mt-1 text-xs text-neutral-500">{description}</p>
        )}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function BrandProfileForm({
  initialName,
  initialSlug,
  initialInstagramHandle,
  initialCoverImageUrl,
  initialCoverImageFocalX,
  initialCoverImageFocalY,
  initialShippingDomestic,
  initialShippingInternational,
  initialReturnWindowDays,
  initialReturnsPaidBy,
  initialShippingCountryCodes,
  contactName,
  contactEmail,
  contactPhone,
}: Props) {
  const [instagramHandle, setInstagramHandle] = useState(
    initialInstagramHandle ?? "",
  );
  const [coverImageUrl, setCoverImageUrl] = useState(
    initialCoverImageUrl ?? "",
  );
  const [appliedImageUrl, setAppliedImageUrl] = useState(
    initialCoverImageUrl ?? "",
  );
  const [coverImageFocalX, setCoverImageFocalX] = useState(
    initialCoverImageFocalX ?? 50,
  );
  const [coverImageFocalY, setCoverImageFocalY] = useState(
    initialCoverImageFocalY ?? 50,
  );
  const initialDomesticTimeframe = parseShippingTimeframe(
    initialShippingDomestic,
  );
  const initialInternationalTimeframe = parseShippingTimeframe(
    initialShippingInternational,
  );

  const [domesticShippingTime, setDomesticShippingTime] = useState(
    initialDomesticTimeframe.time,
  );
  const [domesticShippingUnit, setDomesticShippingUnit] =
    useState<ShippingTimeUnit>(initialDomesticTimeframe.unit);
  const [internationalShippingTime, setInternationalShippingTime] = useState(
    initialInternationalTimeframe.time,
  );
  const [internationalShippingUnit, setInternationalShippingUnit] =
    useState<ShippingTimeUnit>(initialInternationalTimeframe.unit);
  const [returnWindowDays, setReturnWindowDays] = useState<string>(
    initialReturnWindowDays ? String(initialReturnWindowDays) : "",
  );
  const [returnsPaidBy, setReturnsPaidBy] = useState<ReturnsPaidBy | "">(
    initialReturnsPaidBy ?? "",
  );
  const [shippingCountryCodes, setShippingCountryCodes] = useState<string[]>(
    () =>
      (initialShippingCountryCodes ?? []).filter((code) =>
        ALL_COUNTRY_CODES.has(code),
      ),
  );
  const [expandedShippingGroups, setExpandedShippingGroups] = useState<
    string[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [contactNameValue, setContactNameValue] = useState(contactName ?? "");
  const [contactEmailValue, setContactEmailValue] = useState(contactEmail ?? "");
  const [contactPhoneValue, setContactPhoneValue] = useState(contactPhone ?? "");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setAppliedImageUrl(initialCoverImageUrl ?? "");
  }, [initialCoverImageUrl]);
  useEffect(() => {
    setInstagramHandle(initialInstagramHandle ?? "");
  }, [initialInstagramHandle]);

  useEffect(() => {
    setContactNameValue(contactName ?? "");
  }, [contactName]);

  useEffect(() => {
    setContactEmailValue(contactEmail ?? "");
  }, [contactEmail]);

  useEffect(() => {
    setContactPhoneValue(contactPhone ?? "");
  }, [contactPhone]);

  const isWorldwideShipping =
    shippingCountryCodes.length === ALL_COUNTRY_CODES.size;

  const instagramPreviewUrl = useMemo(() => {
    const raw = instagramHandle.trim();
    if (!raw) return "";
    const cleaned = raw
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
      .replace(/^@+/, "")
      .split("/")[0]
      .split("?")[0]
      .trim()
      .toLowerCase();
    return cleaned ? `https://instagram.com/${cleaned}` : "";
  }, [instagramHandle]);

  function resetFocalPoint() {
    setCoverImageFocalX(50);
    setCoverImageFocalY(50);
  }

  function applyImageUrl() {
    setAppliedImageUrl(coverImageUrl.trim());
    resetFocalPoint();
    setMessage(null);
    setError(null);
  }

  function clearImage() {
    setCoverImageUrl("");
    setAppliedImageUrl("");
    resetFocalPoint();
    setMessage(null);
    setError(null);
  }

  async function onUploadFile(file: File) {
    try {
      setUploading(true);
      setMessage(null);
      setError(null);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/brand/profile/cover-upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.url) {
        setError(data?.error || "Upload failed.");
        return;
      }
      setCoverImageUrl(data.url);
      setAppliedImageUrl(data.url);
      resetFocalPoint();
      setMessage("Image uploaded successfully. Drag to reposition, then save.");
    } catch {
      setError("Something went wrong while uploading.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function toggleCountry(code: string) {
    setShippingCountryCodes((prev) =>
      prev.includes(code)
        ? prev.filter((item) => item !== code)
        : [...prev, code],
    );
  }

  function toggleGroup(groupKey: string, countryCodes: string[]) {
    setExpandedShippingGroups((prev) =>
      prev.includes(groupKey) ? prev : [...prev, groupKey],
    );

    setShippingCountryCodes((prev) => {
      const allSelected = countryCodes.every((code) => prev.includes(code));
      if (allSelected)
        return prev.filter((code) => !countryCodes.includes(code));
      return Array.from(new Set([...prev, ...countryCodes]));
    });
  }

  function toggleGroupExpanded(groupKey: string) {
    setExpandedShippingGroups((prev) =>
      prev.includes(groupKey)
        ? prev.filter((key) => key !== groupKey)
        : [...prev, groupKey],
    );
  }

  function clearShippingCountries() {
    setShippingCountryCodes([]);
    setExpandedShippingGroups(COUNTRY_GROUPS.map((group) => group.key));
  }

  function setWorldwideShipping(enabled: boolean) {
    if (enabled) {
      setShippingCountryCodes(Array.from(ALL_COUNTRY_CODES));
      setExpandedShippingGroups([]);
      return;
    }

    setShippingCountryCodes([]);
    setExpandedShippingGroups(COUNTRY_GROUPS.map((group) => group.key));
  }

  async function onSave() {
    try {
      setSaving(true);
      setMessage(null);
      setError(null);
      const res = await fetch("/api/brand/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagramHandle,
          coverImageUrl: appliedImageUrl,
          coverImageFocalX,
          coverImageFocalY,
          contactName: contactNameValue.trim() || null,
          contactEmail: contactEmailValue.trim() || null,
          contactPhone: contactPhoneValue.trim() || null,
          shippingDomestic:
            buildShippingTimeframe(domesticShippingTime, domesticShippingUnit) ||
            null,
          shippingInternational:
            buildShippingTimeframe(
              internationalShippingTime,
              internationalShippingUnit,
            ) || null,
          returnWindowDays: returnWindowDays ? Number(returnWindowDays) : null,
          returnsPaidBy: returnsPaidBy || null,
          shippingCountryCodes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.error || "Failed to save profile.");
        return;
      }
      setInstagramHandle(data?.brand?.instagramHandle ?? "");
      setMessage("Profile updated successfully.");
    } catch {
      setError("Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Account contact ── */}
      <SectionCard
        eyebrow="Account"
        title="Account contact"
        description="These details can be updated by the brand owner."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label
              htmlFor="account-contact-name"
              className="text-sm font-medium text-neutral-700"
            >
              Full name
            </label>
            <input
              id="account-contact-name"
              value={contactNameValue}
              onChange={(e) => setContactNameValue(e.target.value)}
              placeholder="Full name"
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]/40 focus:ring-2 focus:ring-[#7B2D3E]/10"
            />
          </div>

          <div>
            <label
              htmlFor="account-contact-email"
              className="text-sm font-medium text-neutral-700"
            >
              Email address
            </label>
            <input
              id="account-contact-email"
              type="email"
              value={contactEmailValue}
              onChange={(e) => setContactEmailValue(e.target.value)}
              placeholder="Email address"
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]/40 focus:ring-2 focus:ring-[#7B2D3E]/10"
            />
          </div>

          <div>
            <label
              htmlFor="account-contact-phone"
              className="text-sm font-medium text-neutral-700"
            >
              Phone number
            </label>
            <input
              id="account-contact-phone"
              type="tel"
              value={contactPhoneValue}
              onChange={(e) => setContactPhoneValue(e.target.value)}
              placeholder="Phone number"
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]/40 focus:ring-2 focus:ring-[#7B2D3E]/10"
            />
          </div>
        </div>
      </SectionCard>

      {/* ── Brand profile ── */}
      <SectionCard
        eyebrow="Profile"
        title="Brand profile"
        description="Manage how your brand appears across Veilora."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label
              htmlFor="brand-name"
              className="text-sm font-medium text-neutral-700"
            >
              Brand name
            </label>

            <input
              id="brand-name"
              value={initialName}
              disabled
              className="mt-2 w-full rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="brand-slug"
              className="text-sm font-medium text-neutral-700"
            >
              Brand Handle
            </label>

            <input
              id="brand-slug"
              value={initialSlug}
              disabled
              className="mt-2 w-full rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm outline-none"
            />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-black/10 bg-neutral-50 p-4">
          <label
            htmlFor="brand-instagram-handle"
            className="text-sm font-medium text-neutral-700"
          >
            Instagram handle
          </label>

          <input
            id="brand-instagram-handle"
            value={instagramHandle}
            onChange={(e) => setInstagramHandle(e.target.value)}
            placeholder="@brandname"
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]/40 focus:ring-2 focus:ring-[#7B2D3E]/10"
          />
          <p className="mt-2 text-xs text-black/50">
            Enter @brandname, brandname, or a full Instagram profile URL.
          </p>
          {instagramPreviewUrl ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-neutral-700">
                {instagramPreviewUrl.replace(/^https?:\/\//, "")}
              </div>
              <a
                href={instagramPreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-neutral-900 underline decoration-black/20 underline-offset-4 hover:text-black"
              >
                Open Instagram
              </a>
            </div>
          ) : null}
        </div>

        {/* Cover image upload */}
        <div className="mt-6">
          <div className="text-sm font-medium text-neutral-700">
            Upload cover image
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            aria-label="Upload brand cover image"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadFile(file);
            }}
          />
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!uploading) setIsDragOver(true);
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!uploading) setIsDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const n = e.relatedTarget as Node | null;
              if (!e.currentTarget.contains(n)) setIsDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(false);
              if (uploading) return;
              const file = e.dataTransfer.files?.[0];
              if (file) onUploadFile(file);
            }}
            className={`mt-4 rounded-3xl border border-dashed p-8 transition ${isDragOver ? "border-black bg-black/[0.04]" : "border-black/10 bg-neutral-50 hover:bg-black/[0.03]"}`}
          >
            <div className="flex flex-col items-center justify-center text-center">
              <div className="text-sm font-medium text-black">
                Upload your brand cover
              </div>
              <p className="mt-1 text-xs text-black/60">
                This image will appear on your brand page and homepage.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-4 rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-medium hover:bg-black/[0.05] transition"
              >
                {uploading ? "Uploading..." : "Choose image"}
              </button>
              <p className="mt-4 text-xs text-black/50">
                JPG, PNG, or WEBP. Best results with wide landscape images.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-black/10 p-4 bg-neutral-50 space-y-3">
          <label
            htmlFor="brand-cover-image-url"
            className="text-sm font-medium text-neutral-700"
          >
            Or use an image URL
          </label>

          <input
            id="brand-cover-image-url"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://example.com/your-brand-cover.jpg"
            className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]/40 focus:ring-2 focus:ring-[#7B2D3E]/10"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={applyImageUrl}
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs text-neutral-700 transition hover:bg-[#fdf7f4]"
            >
              Apply image
            </button>

            <button
              type="button"
              onClick={clearImage}
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs text-neutral-700 transition hover:bg-[#fdf7f4]"
            >
              Remove image
            </button>
            <button
              type="button"
              onClick={resetFocalPoint}
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs text-neutral-700 transition hover:bg-[#fdf7f4]"
            >
              Reset position
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-black/10 p-4 bg-white">
          <CoverImagePositionEditor
            imageUrl={appliedImageUrl}
            brandName={initialName}
            focalX={coverImageFocalX}
            focalY={coverImageFocalY}
            onChange={({ focalX, focalY }) => {
              setCoverImageFocalX(focalX);
              setCoverImageFocalY(focalY);
            }}
          />
        </div>
      </SectionCard>

      {/* ── Shipping & Returns ── */}
      <SectionCard
        eyebrow="Logistics"
        title="Shipping & returns"
        description="This information will be shown to shoppers on your product pages. Set it once and it applies to all your products."
      >
        <div className="space-y-6">
          {/* Domestic shipping */}
          <div className="rounded-2xl border border-black/10 bg-neutral-50 p-4 space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
                Domestic shipping
              </p>

              <p className="mt-0.5 text-xs text-black/50">
                Delivery time for shoppers in your home country (same country as
                your brand).
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <input
                value={domesticShippingTime}
                onChange={(e) => setDomesticShippingTime(e.target.value)}
                placeholder="e.g. 2–4"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]/40 focus:ring-2 focus:ring-[#7B2D3E]/10"
              />
              <select
                aria-label="Domestic shipping time unit"
                value={domesticShippingUnit}
                onChange={(e) =>
                  setDomesticShippingUnit(e.target.value as ShippingTimeUnit)
                }
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]/40 focus:ring-2 focus:ring-[#7B2D3E]/10"
              >
                {SHIPPING_TIME_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* International shipping */}
          <div className="rounded-2xl border border-black/10 bg-neutral-50 p-4 space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
                International shipping
              </p>
              <p className="mt-0.5 text-xs text-black/50">
                Delivery time for shoppers outside your home country.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <input
                value={internationalShippingTime}
                onChange={(e) => setInternationalShippingTime(e.target.value)}
                placeholder="e.g. 1–3"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]/40 focus:ring-2 focus:ring-[#7B2D3E]/10"
              />
              <select
                aria-label="International shipping time unit"
                value={internationalShippingUnit}
                onChange={(e) =>
                  setInternationalShippingUnit(
                    e.target.value as ShippingTimeUnit,
                  )
                }
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]/40 focus:ring-2 focus:ring-[#7B2D3E]/10"
              >
                {SHIPPING_TIME_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Shipping countries */}
          <div className="rounded-2xl border border-black/10 bg-neutral-50 p-4 space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
                Countries you ship to
              </p>
              <p className="mt-0.5 text-xs text-black/50">
                Choose worldwide shipping, or select regions and remove any
                countries you do not ship to.
              </p>
            </div>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white px-4 py-3">
              <span>
                <span className="block text-sm font-medium text-black">
                  Worldwide shipping
                </span>
                <span className="block text-xs text-black/45">
                  Tick this if you ship to all supported countries.
                </span>
              </span>
              <input
                type="checkbox"
                checked={isWorldwideShipping}
                onChange={(e) => setWorldwideShipping(e.target.checked)}
                className="h-5 w-5 rounded border-black/20 accent-[#7B2D3E]"
              />
            </label>

            {!isWorldwideShipping ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-xl border border-black/8 bg-white px-4 py-3 text-sm text-black/60 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="font-medium text-black/80">Selected:</span>{" "}
                    {shippingCountryCodes.length} countries
                  </div>
                  <button
                    type="button"
                    onClick={clearShippingCountries}
                    className="w-fit rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#fdf7f4]"
                  >
                    Clear selection
                  </button>
                </div>

                {COUNTRY_GROUPS.map((group) => {
                  const groupCodes = group.countries.map(
                    (country) => country.code,
                  );
                  const selectedCount = groupCodes.filter((code) =>
                    shippingCountryCodes.includes(code),
                  ).length;
                  const allSelected = selectedCount === groupCodes.length;
                  const partiallySelected = selectedCount > 0 && !allSelected;
                  const expanded =
                    expandedShippingGroups.includes(group.key) ||
                    selectedCount > 0;

                  return (
                    <div
                      key={group.key}
                      className="rounded-2xl border border-black/10 bg-white p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => toggleGroupExpanded(group.key)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block text-sm font-medium text-black">
                            {group.label}
                          </span>
                          <span className="block text-xs text-black/45">
                            {selectedCount} of {groupCodes.length} selected ·{" "}
                            {expanded ? "Hide countries" : "Show countries"}
                          </span>
                        </button>

                        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-black/60">
                          <span>Select all</span>
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = partiallySelected;
                            }}
                            onChange={() => toggleGroup(group.key, groupCodes)}
                            className="h-5 w-5 rounded border-black/20 accent-[#7B2D3E]"
                          />
                        </label>
                      </div>

                      {expanded ? (
                        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {group.countries.map((country) => (
                            <label
                              key={country.code}
                              className="flex cursor-pointer items-center gap-2 rounded-xl border border-black/8 bg-neutral-50 px-3 py-2 text-sm text-black/70 hover:bg-[#fdf7f4]"
                            >
                              <input
                                type="checkbox"
                                checked={shippingCountryCodes.includes(
                                  country.code,
                                )}
                                onChange={() => toggleCountry(country.code)}
                                className="h-4 w-4 rounded border-black/20 accent-[#7B2D3E]"
                              />
                              <span>{country.name}</span>
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Returns */}
          <div className="rounded-2xl border border-black/10 bg-neutral-50 p-4 space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
                Returns policy
              </p>
              <p className="mt-0.5 text-xs text-black/50">
                Let shoppers know your return window and who covers return
                postage.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-black/60">
                  Return window (days)
                </label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={returnWindowDays}
                  onChange={(e) => setReturnWindowDays(e.target.value)}
                  placeholder="e.g. 14"
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]/40 focus:ring-2 focus:ring-[#7B2D3E]/10"
                />
                
              </div>

              <div>
                <label
                  htmlFor="returns-paid-by"
                  className="text-xs font-medium text-black/60"
                >
                  Who pays return postage?
                </label>
                <select
                  id="returns-paid-by"
                  value={returnsPaidBy}
                  onChange={(e) =>
                    setReturnsPaidBy(e.target.value as ReturnsPaidBy | "")
                  }
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]/40 focus:ring-2 focus:ring-[#7B2D3E]/10"
                >
                  <option value="">Select...</option>
                  <option value="BUYER">Buyer pays return postage</option>
                  <option value="BRAND">Brand covers return postage</option>
                </select>
              </div>
            </div>

            
          </div>
        </div>
      </SectionCard>

      {/* ── Save button ── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || uploading}
          className="rounded-2xl bg-[#7B2D3E] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#6a2435] shadow-sm"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
        {message && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
