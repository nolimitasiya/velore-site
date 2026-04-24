"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CoverImagePositionEditor from "@/components/brand/CoverImagePositionEditor";

type Props = {
  initialName: string;
  initialSlug: string;
  initialInstagramHandle?: string | null;
  initialCoverImageUrl: string | null;
  initialCoverImageFocalX?: number | null;
  initialCoverImageFocalY?: number | null;
};

export default function BrandProfileForm({
  initialName,
  initialSlug,
  initialInstagramHandle,
  initialCoverImageUrl,
  initialCoverImageFocalX,
  initialCoverImageFocalY,
}: Props) {
  const [instagramHandle, setInstagramHandle] = useState(
    initialInstagramHandle ?? ""
  );
  const [coverImageUrl, setCoverImageUrl] = useState(initialCoverImageUrl ?? "");
  const [appliedImageUrl, setAppliedImageUrl] = useState(initialCoverImageUrl ?? "");
  const [coverImageFocalX, setCoverImageFocalX] = useState(initialCoverImageFocalX ?? 50);
  const [coverImageFocalY, setCoverImageFocalY] = useState(initialCoverImageFocalY ?? 50);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setAppliedImageUrl(initialCoverImageUrl ?? "");
  }, [initialCoverImageUrl]);

  useEffect(() => {
    setInstagramHandle(initialInstagramHandle ?? "");
  }, [initialInstagramHandle]);

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
    const trimmed = coverImageUrl.trim();
    setAppliedImageUrl(trimmed);
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
      <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <div>
          <div className="text-xl font-semibold">Brand profile</div>
          <p className="mt-1 text-sm text-black/60">
            Manage how your brand appears across Veilora.
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="brand-name" className="text-sm font-medium">
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
            <label htmlFor="brand-slug" className="text-sm font-medium">
              Slug
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
          <label htmlFor="brand-instagram-handle" className="text-sm font-medium">
            Instagram handle
          </label>

          <input
            id="brand-instagram-handle"
            value={instagramHandle}
            onChange={(e) => setInstagramHandle(e.target.value)}
            placeholder="@brandname"
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black"
          />

          <p className="mt-2 text-xs text-black/50">
            Add your Instagram so shoppers can discover your brand. You can enter
            @brandname, brandname, or a full Instagram profile URL.
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

        <div className="mt-6">
          <div className="text-sm font-medium">Upload cover image</div>

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

              const nextTarget = e.relatedTarget as Node | null;
              if (!e.currentTarget.contains(nextTarget)) {
                setIsDragOver(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(false);

              if (uploading) return;

              const file = e.dataTransfer.files?.[0];
              if (file) onUploadFile(file);
            }}
            className={`mt-4 rounded-3xl border border-dashed p-8 transition group ${
              isDragOver
                ? "border-black bg-black/[0.04]"
                : "border-black/10 bg-neutral-50 hover:bg-black/[0.03]"
            }`}
          >
            <div className="flex flex-col items-center justify-center text-center">
              <div className="text-sm font-medium text-black">
                Upload your brand cover
              </div>

              <p className="mt-1 text-xs text-black/60">
                This image will appear on your brand page and homepage.
              </p>

              <p className="mt-1 text-xs text-black/60">
                Or choose a file from your device
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
                JPG, PNG, or WEBP. Best results with wide landscape images, such
                as 1600×900 or 2000×1200.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-black/10 p-4 bg-neutral-50 space-y-3">
          <label htmlFor="brand-cover-image-url" className="text-sm font-medium">
            Or use an image URL
          </label>
          <input
            id="brand-cover-image-url"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://example.com/your-brand-cover.jpg"
            className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black"
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={applyImageUrl}
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/[0.05] transition"
            >
              Apply image
            </button>

            <button
              type="button"
              onClick={clearImage}
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/[0.05] transition"
            >
              Remove image
            </button>

            <button
              type="button"
              onClick={resetFocalPoint}
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/[0.05] transition"
            >
              Reset position
            </button>
          </div>

          <p className="mt-2 text-xs text-black/50">
            You can upload directly or paste an external image URL.
          </p>
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

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || uploading}
            className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 transition shadow-sm"
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
    </div>
  );
}