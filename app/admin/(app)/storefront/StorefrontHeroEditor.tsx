"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Hero, type StorefrontHeroData } from "@/components/Hero";

type StorefrontHero = StorefrontHeroData & {
  id: string;
  title: string | null;
  subtitle: string | null;
  desktopImageUrl: string;
  mobileImageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  overlayOpacity: number;
  focalX: number;
  focalY: number;
  textAlign: "LEFT" | "CENTER" | "RIGHT";
  textX: number;
  textY: number;
  isActive: boolean;
};

export default function StorefrontHeroEditor() {
  const [form, setForm] = useState<StorefrontHero | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const previewRef = useRef<HTMLDivElement | null>(null);
  const textDragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState(false);

  useEffect(() => {
    let mounted = true;

    fetch("/api/admin/storefront/hero", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data: StorefrontHero) => {
        if (mounted) setForm(data);
      })
      .catch(() => {
        if (mounted) setStatus("Failed to load hero.");
      });

    return () => {
      mounted = false;
    };
  }, []);

  function update<K extends keyof StorefrontHero>(key: K, value: StorefrontHero[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  function getRelativePosition(clientX: number, clientY: number) {
    const el = previewRef.current;
    if (!el) return null;

    const rect = el.getBoundingClientRect();
    const x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);

    return { x, y };
  }

  function startImageDrag(e: ReactMouseEvent<HTMLDivElement>) {
    if (!form) return;

    const target = e.target as HTMLElement;
    if (target.closest("[data-hero-text-drag]")) return;

    const pos = getRelativePosition(e.clientX, e.clientY);
    if (!pos) return;

    update("focalX", Math.round(pos.x));
    update("focalY", Math.round(pos.y));
    setIsDraggingImage(true);
  }

  function startTextDrag(e: ReactMouseEvent<HTMLDivElement>) {
    if (!form) return;
    e.stopPropagation();

    const pos = getRelativePosition(e.clientX, e.clientY);
    if (!pos) return;

    textDragOffsetRef.current = {
      x: pos.x - form.textX,
      y: pos.y - form.textY,
    };

    setIsDraggingText(true);
  }

  function handlePreviewMouseMove(e: ReactMouseEvent<HTMLDivElement>) {
    if (!form) return;

    const pos = getRelativePosition(e.clientX, e.clientY);
    if (!pos) return;

    if (isDraggingImage) {
      update("focalX", Math.round(pos.x));
      update("focalY", Math.round(pos.y));
    }

    if (isDraggingText && textDragOffsetRef.current) {
      update(
        "textX",
        Math.round(clamp(pos.x - textDragOffsetRef.current.x, 0, 100))
      );
      update(
        "textY",
        Math.round(clamp(pos.y - textDragOffsetRef.current.y, 0, 100))
      );
    }
  }

  function stopDragging() {
    setIsDraggingImage(false);
    setIsDraggingText(false);
    textDragOffsetRef.current = null;
  }

  async function onSave() {
    if (!form) return;

    setSaving(true);
    setStatus("");

    try {
      const res = await fetch("/api/admin/storefront/hero", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Save failed");

      const data: StorefrontHero = await res.json();
      setForm(data);
      setStatus("Hero updated successfully.");
    } catch {
      setStatus("Failed to save hero.");
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return (
      <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
        <p className="text-sm text-neutral-500">Loading hero…</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
          Storefront
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
          Homepage hero
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Manage the main storefront image, text and call-to-action shown at the
          top of the homepage.
        </p>
      </div>

      <div className="space-y-8">
        <div className="space-y-5">
          <Field id="hero-title" label="Title">
            <input
              id="hero-title"
              className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-black/30"
              value={form.title ?? ""}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Discover modest fashion from around the world"
            />
          </Field>

          <Field id="hero-subtitle" label="Subtitle">
            <textarea
              id="hero-subtitle"
              className="min-h-[120px] w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-black/30"
              value={form.subtitle ?? ""}
              onChange={(e) => update("subtitle", e.target.value)}
              placeholder="Curated pieces for work, occasion, everyday and beyond."
            />
          </Field>

          <Field id="hero-desktop-image-url" label="Desktop image URL">
            <input
              id="hero-desktop-image-url"
              className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-black/30"
              value={form.desktopImageUrl}
              onChange={(e) => update("desktopImageUrl", e.target.value)}
              placeholder="https://..."
            />
          </Field>

          <Field id="hero-mobile-image-url" label="Mobile image URL">
            <input
              id="hero-mobile-image-url"
              className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-black/30"
              value={form.mobileImageUrl ?? ""}
              onChange={(e) => update("mobileImageUrl", e.target.value)}
              placeholder="Optional mobile-specific image"
            />
          </Field>

          <Field id="hero-text-align" label="Text alignment">
            <select
              id="hero-text-align"
              aria-label="Text alignment"
              title="Text alignment"
              className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-black/30"
              value={form.textAlign}
              onChange={(e) =>
                update("textAlign", e.target.value as "LEFT" | "CENTER" | "RIGHT")
              }
            >
              <option value="LEFT">Left</option>
              <option value="CENTER">Center</option>
              <option value="RIGHT">Right</option>
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="hero-cta-label" label="CTA label">
              <input
                id="hero-cta-label"
                className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-black/30"
                value={form.ctaLabel ?? ""}
                onChange={(e) => update("ctaLabel", e.target.value)}
                placeholder="Shop now"
              />
            </Field>

            <Field id="hero-cta-link" label="CTA link">
              <input
                id="hero-cta-link"
                className="w-full rounded-2xl border border-black/10 px-4 py-3 text-sm outline-none transition focus:border-black/30"
                value={form.ctaHref ?? ""}
                onChange={(e) => update("ctaHref", e.target.value)}
                placeholder="/new-in"
              />
            </Field>
          </div>

          <div className="space-y-4 rounded-3xl border border-black/10 bg-neutral-50 p-4">
            <div>
              <p className="text-sm font-medium text-neutral-900">Image controls</p>
              <p className="mt-1 text-xs text-neutral-500">
                Drag directly on the preview image, or fine-tune with the sliders below.
              </p>
            </div>

            <SliderField
              id="hero-overlay-opacity"
              label="Overlay opacity"
              value={form.overlayOpacity}
              min={0}
              max={100}
              onChange={(value) => update("overlayOpacity", value)}
            />

            <SliderField
              id="hero-focal-x"
              label="Focal X"
              value={form.focalX}
              min={0}
              max={100}
              onChange={(value) => update("focalX", value)}
              hint="0 = left, 100 = right"
            />

            <SliderField
              id="hero-focal-y"
              label="Focal Y"
              value={form.focalY}
              min={0}
              max={100}
              onChange={(value) => update("focalY", value)}
              hint="0 = top, 100 = bottom"
            />
          </div>

          <div className="space-y-4 rounded-3xl border border-black/10 bg-neutral-50 p-4">
            <div>
              <p className="text-sm font-medium text-neutral-900">Text controls</p>
              <p className="mt-1 text-xs text-neutral-500">
                Drag the text block in the preview, or fine-tune it with the sliders below.
              </p>
            </div>

            <SliderField
              id="hero-text-x"
              label="Text X"
              value={form.textX}
              min={0}
              max={100}
              onChange={(value) => update("textX", value)}
              hint="0 = left, 100 = right"
            />

            <SliderField
              id="hero-text-y"
              label="Text Y"
              value={form.textY}
              min={0}
              max={100}
              onChange={(value) => update("textY", value)}
              hint="0 = top, 100 = bottom"
            />
          </div>

          <label
            htmlFor="hero-is-active"
            className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3 text-sm text-neutral-700"
          >
            <input
              id="hero-is-active"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => update("isActive", e.target.checked)}
            />
            Hero active
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save hero"}
            </button>

            {status ? <p className="text-sm text-neutral-600">{status}</p> : null}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-neutral-700">Live preview</p>
            <p className="text-xs text-neutral-500">
              Image: {Math.round(form.focalX)}, {Math.round(form.focalY)} · Text:{" "}
              {Math.round(form.textX)}, {Math.round(form.textY)}
            </p>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-black/10 bg-neutral-100 shadow-sm">
            <div
              ref={previewRef}
              className={`relative w-full overflow-hidden ${
                isDraggingText ? "cursor-move" : isDraggingImage ? "cursor-crosshair" : "cursor-crosshair"
              }`}
              onMouseDown={startImageDrag}
              onMouseMove={handlePreviewMouseMove}
              onMouseUp={stopDragging}
              onMouseLeave={stopDragging}
            >
              <Hero
                hero={form}
                preview
                textDraggable
                isDraggingText={isDraggingText}
                onTextMouseDown={startTextDrag}
              />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-black/10 bg-neutral-50 p-4">
            <p className="text-xs leading-5 text-neutral-500">
              Drag anywhere on the image to change the crop. Drag the text block to
              reposition it. You can also use the sliders for more precise control.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-neutral-700"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function SliderField({
  id,
  label,
  value,
  min,
  max,
  hint,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  hint?: string;
  onChange: (value: number) => void;
}) {
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-neutral-700">
          {label}
        </label>
        <span className="min-w-[40px] text-right text-sm text-neutral-500">{value}</span>
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-describedby={hintId}
        className="w-full"
      />

      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-neutral-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}