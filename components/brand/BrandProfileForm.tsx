// C:\Users\Asiya\projects\dalra\components\brand\BrandProfileForm.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CoverImagePositionEditor from "@/components/brand/CoverImagePositionEditor";

type ReturnsPaidBy = "BUYER" | "BRAND" | "NO_RETURNS";

type Props = {
  initialName: string;
  initialSlug: string;
  initialInstagramHandle?: string | null;
  initialCoverImageUrl: string | null;
  initialCoverImageFocalX?: number | null;
  initialCoverImageFocalY?: number | null;
  initialShippingDomestic?: string | null;
  initialShippingInternational?: string | null;
  initialReturnWindowDays?: number | null;
  initialReturnsPaidBy?: ReturnsPaidBy | null;
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
        {description && <p className="mt-1 text-xs text-neutral-500">{description}</p>}
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
}: Props) {
  const [instagramHandle, setInstagramHandle] = useState(initialInstagramHandle ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initialCoverImageUrl ?? "");
  const [appliedImageUrl, setAppliedImageUrl] = useState(initialCoverImageUrl ?? "");
  const [coverImageFocalX, setCoverImageFocalX] = useState(initialCoverImageFocalX ?? 50);
  const [coverImageFocalY, setCoverImageFocalY] = useState(initialCoverImageFocalY ?? 50);
  const [shippingDomestic, setShippingDomestic] = useState(initialShippingDomestic ?? "");
  const [shippingInternational, setShippingInternational] = useState(initialShippingInternational ?? "");
  const [returnWindowDays, setReturnWindowDays] = useState<string>(
    initialReturnWindowDays ? String(initialReturnWindowDays) : ""
  );
  const [returnsPaidBy, setReturnsPaidBy] = useState<ReturnsPaidBy | "">(
    initialReturnsPaidBy ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { setAppliedImageUrl(initialCoverImageUrl ?? ""); }, [initialCoverImageUrl]);
  useEffect(() => { setInstagramHandle(initialInstagramHandle ?? ""); }, [initialInstagramHandle]);

  const instagramPreviewUrl = useMemo(() => {
    const raw = instagramHandle.trim();
    if (!raw) return "";
    const cleaned = raw
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
      .replace(/^@+/, "")
      .split("/")[0].split("?")[0].trim().toLowerCase();
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
      const res = await fetch("/api/brand/profile/cover-upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.url) { setError(data?.error || "Upload failed."); return; }
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
          shippingDomestic: shippingDomestic || null,
          shippingInternational: shippingInternational || null,
          returnWindowDays: returnWindowDays ? Number(returnWindowDays) : null,
          returnsPaidBy: returnsPaidBy || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setError(data?.error || "Failed to save profile."); return; }
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

      {/* ── Brand profile ── */}
      <SectionCard eyebrow="Profile" title="Brand profile" description="Manage how your brand appears across Veilora.">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="brand-name" className="text-sm font-medium text-neutral-700">Brand name</label>

            <input id="brand-name" value={initialName} disabled className="mt-2 w-full rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm outline-none" />
          </div>
          <div>
            <label htmlFor="brand-slug" className="text-sm font-medium text-neutral-700">Brand Handle</label>


            <input id="brand-slug" value={initialSlug} disabled className="mt-2 w-full rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm outline-none" />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-black/10 bg-neutral-50 p-4">
          <label htmlFor="brand-instagram-handle" className="text-sm font-medium text-neutral-700">Instagram handle</label>


          <input
            id="brand-instagram-handle"
            value={instagramHandle}
            onChange={(e) => setInstagramHandle(e.target.value)}
            placeholder="@brandname"
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]/40 focus:ring-2 focus:ring-[#7B2D3E]/10"
          />
          <p className="mt-2 text-xs text-black/50">Enter @brandname, brandname, or a full Instagram profile URL.</p>
          {instagramPreviewUrl ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-neutral-700">
                {instagramPreviewUrl.replace(/^https?:\/\//, "")}
              </div>
              <a href={instagramPreviewUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-neutral-900 underline decoration-black/20 underline-offset-4 hover:text-black">
                Open Instagram
              </a>
            </div>
          ) : null}
        </div>

        {/* Cover image upload */}
        <div className="mt-6">
          <div className="text-sm font-medium text-neutral-700">Upload cover image</div>

          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" aria-label="Upload brand cover image"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) onUploadFile(file); }} />
          <div
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (!uploading) setIsDragOver(true); }}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); if (!uploading) setIsDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); const n = e.relatedTarget as Node | null; if (!e.currentTarget.contains(n)) setIsDragOver(false); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); if (uploading) return; const file = e.dataTransfer.files?.[0]; if (file) onUploadFile(file); }}
            className={`mt-4 rounded-3xl border border-dashed p-8 transition ${isDragOver ? "border-black bg-black/[0.04]" : "border-black/10 bg-neutral-50 hover:bg-black/[0.03]"}`}
          >
            <div className="flex flex-col items-center justify-center text-center">
              <div className="text-sm font-medium text-black">Upload your brand cover</div>
              <p className="mt-1 text-xs text-black/60">This image will appear on your brand page and homepage.</p>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="mt-4 rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-medium hover:bg-black/[0.05] transition">
                {uploading ? "Uploading..." : "Choose image"}
              </button>
              <p className="mt-4 text-xs text-black/50">JPG, PNG, or WEBP. Best results with wide landscape images.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-black/10 p-4 bg-neutral-50 space-y-3">
          <label htmlFor="brand-cover-image-url" className="text-sm font-medium text-neutral-700">Or use an image URL</label>

          <input id="brand-cover-image-url" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://example.com/your-brand-cover.jpg"
            className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]/40 focus:ring-2 focus:ring-[#7B2D3E]/10"/>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" onClick={applyImageUrl} className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs text-neutral-700 transition hover:bg-[#fdf7f4]">Apply image</button>

            <button type="button" onClick={clearImage} className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs text-neutral-700 transition hover:bg-[#fdf7f4]">Remove image</button>
            <button type="button" onClick={resetFocalPoint} className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs text-neutral-700 transition hover:bg-[#fdf7f4]">Reset position</button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-black/10 p-4 bg-white">
          <CoverImagePositionEditor imageUrl={appliedImageUrl} brandName={initialName} focalX={coverImageFocalX} focalY={coverImageFocalY}
            onChange={({ focalX, focalY }) => { setCoverImageFocalX(focalX); setCoverImageFocalY(focalY); }} />
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">Domestic shipping</p>

              <p className="mt-0.5 text-xs text-black/50">
                Delivery time for shoppers in your home country (same country as your brand).
              </p>
            </div>
            <input
              value={shippingDomestic}
              onChange={(e) => setShippingDomestic(e.target.value)}
              placeholder="e.g. 2–4 working days"
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]/40 focus:ring-2 focus:ring-[#7B2D3E]/10"
            />
          </div>

          {/* International shipping */}
          <div className="rounded-2xl border border-black/10 bg-neutral-50 p-4 space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">International shipping</p>
              <p className="mt-0.5 text-xs text-black/50">
                Delivery time for shoppers outside your home country.
              </p>
            </div>
            <input
              value={shippingInternational}
              onChange={(e) => setShippingInternational(e.target.value)}
              placeholder="e.g. 1–3 weeks"
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]/40 focus:ring-2 focus:ring-[#7B2D3E]/10"
            />
          </div>

          {/* Returns */}
          <div className="rounded-2xl border border-black/10 bg-neutral-50 p-4 space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">Returns policy</p>
              <p className="mt-0.5 text-xs text-black/50">
                Let shoppers know your return window and who covers return postage.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-black/60">Return window (days)</label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={returnWindowDays}
                  onChange={(e) => setReturnWindowDays(e.target.value)}
                  placeholder="e.g. 14"
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]/40 focus:ring-2 focus:ring-[#7B2D3E]/10"
                />
                <p className="mt-1 text-xs text-black/40">Enter 0 for no returns.</p>
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
    onChange={(e) => setReturnsPaidBy(e.target.value as ReturnsPaidBy | "")}
    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#7B2D3E]/40 focus:ring-2 focus:ring-[#7B2D3E]/10"
  >
    <option value="">Select...</option>
    <option value="BUYER">Buyer pays return postage</option>
    <option value="BRAND">Brand covers return postage</option>
    <option value="NO_RETURNS">No returns accepted</option>
  </select>
</div>
            </div>

            {/* Preview */}
            {(returnWindowDays || returnsPaidBy) && (
              <div className="rounded-xl border border-black/8 bg-white px-4 py-3 text-sm text-black/60">
                <span className="font-medium text-black/80">Preview: </span>
                {returnsPaidBy === "NO_RETURNS"
                  ? "No returns accepted."
                  : returnWindowDays
                  ? `${returnWindowDays}-day returns · ${returnsPaidBy === "BRAND" ? "Brand covers return postage" : "Buyer pays return postage"}`
                  : returnsPaidBy === "BRAND"
                  ? "Brand covers return postage"
                  : "Buyer pays return postage"}
              </div>
            )}
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
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">{message}</div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
      </div>
    </div>
  );
}
