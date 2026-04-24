"use client";

import { useEffect, useMemo, useRef, useState } from "react";



type FeedItem = {
  localId: string;
  title: string;
  instagramHandle: string;

  imageUrl: string;
  imagePath: string;
  imageAlt: string;
  imageWidth: number | null;
  imageHeight: number | null;
  imageFocalX: number;
  imageFocalY: number;

  postUrl: string;
  caption: string;
  sortOrder: number;
  isActive: boolean;

  isUploading: boolean;
  uploadError: string | null;
};

function makeLocalId() {
  return Math.random().toString(36).slice(2, 10);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function FocalPointPreview(props: {
  imageUrl: string;
  alt: string;
  focalX: number;
  focalY: number;
  onChange: (x: number, y: number) => void;
}) {
  const { imageUrl, alt, focalX, focalY, onChange } = props;
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);

  function updateFromClientPoint(clientX: number, clientY: number) {
    const frame = frameRef.current;
    if (!frame) return;

    const rect = frame.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);

    onChange(Number(x.toFixed(2)), Number(y.toFixed(2)));
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-sm font-medium">Preview</div>
        <div className="text-xs text-black/45">
          Drag to set crop focus · 4:5
        </div>
      </div>

      <div
        ref={frameRef}
        className="relative overflow-hidden rounded-xl border border-black/10 bg-black/5 aspect-[4/5] touch-none select-none"
        onPointerDown={(e) => {
          if (!imageUrl) return;
          setDragging(true);
          e.currentTarget.setPointerCapture(e.pointerId);
          updateFromClientPoint(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!dragging || !imageUrl) return;
          updateFromClientPoint(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (!imageUrl) return;
          setDragging(false);
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {}
        }}
        onPointerLeave={() => {
          setDragging(false);
        }}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={alt || "Style feed preview"}
              className="h-full w-full object-cover"
              style={{
                objectPosition: `${focalX}% ${focalY}%`,
              }}
              draggable={false}
            />

            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/[0.03]" />

              <div
                className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/25 shadow-sm"
                style={{
                  left: `${focalX}%`,
                  top: `${focalY}%`,
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-black/40">
            No image yet
          </div>
        )}
      </div>
    </div>
  );
}

export default function StyleFeedEditor() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);


  const hasUploadingItem = useMemo(
    () => items.some((item) => item.isUploading),
    [items]
  );

  async function load() {
    setBusy(true);
    setError(null);

    const res = await fetch("/api/admin/storefront/style-feed", {
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.ok) {
      setError(json?.error ?? "Failed to load homepage style feed.");
      setBusy(false);
      return;
    }

    const nextItems: FeedItem[] = (json.items ?? []).map((item: any, index: number) => ({
      localId: makeLocalId(),
      title: item.title ?? "",
      instagramHandle: item.instagramHandle ?? "",

      imageUrl: item.imageUrl ?? "",
      imagePath: item.imagePath ?? "",
      imageAlt: item.imageAlt ?? "",
      imageWidth: typeof item.imageWidth === "number" ? item.imageWidth : null,
      imageHeight: typeof item.imageHeight === "number" ? item.imageHeight : null,
      imageFocalX:
        typeof item.imageFocalX === "number" ? item.imageFocalX : 50,
      imageFocalY:
        typeof item.imageFocalY === "number" ? item.imageFocalY : 50,

      postUrl: item.postUrl ?? "",
      caption: item.caption ?? "",
      sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : index,
      isActive: item.isActive !== false,

      isUploading: false,
      uploadError: null,
    }));

    setItems(nextItems);
    setBusy(false);
  }

  useEffect(() => {
    load();
  }, []);

  

  function addItem() {
    if (items.length >= 4) return;

    setItems((prev) => [
      ...prev,
      {
        localId: makeLocalId(),
        title: "",
        instagramHandle: "",

        imageUrl: "",
        imagePath: "",
        imageAlt: "",
        imageWidth: null,
        imageHeight: null,
        imageFocalX: 50,
        imageFocalY: 50,

        postUrl: "",
        caption: "",
        sortOrder: prev.length,
        isActive: true,

        isUploading: false,
        uploadError: null,
      },
    ]);
  }

  function removeItem(localId: string) {
    setItems((prev) =>
      prev
        .filter((item) => item.localId !== localId)
        .map((item, index) => ({ ...item, sortOrder: index }))
    );

  }

  function updateItem(localId: string, updater: (item: FeedItem) => FeedItem) {
    setItems((prev) =>
      prev.map((item) => (item.localId === localId ? updater(item) : item))
    );
  }

  async function handleUpload(localId: string, file: File) {
    const current = items.find((item) => item.localId === localId);
    if (!current) return;

    

    updateItem(localId, (item) => ({
      ...item,
      isUploading: true,
      uploadError: null,
    }));

    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload/style-feed", {
        method: "POST",
        body: formData,
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        updateItem(localId, (item) => ({
          ...item,
          isUploading: false,
          uploadError: json?.error ?? "Upload failed.",
        }));
        return;
      }

      updateItem(localId, (item) => ({
        ...item,
        imageUrl: json.imageUrl ?? "",
        imagePath: json.imagePath ?? "",
        imageWidth:
          typeof json.imageWidth === "number" ? json.imageWidth : null,
        imageHeight:
          typeof json.imageHeight === "number" ? json.imageHeight : null,
        imageAlt:
  item.imageAlt || item.title || item.caption || "",
        imageFocalX:
          typeof json.imageFocalX === "number" ? json.imageFocalX : 50,
        imageFocalY:
          typeof json.imageFocalY === "number" ? json.imageFocalY : 50,
        isUploading: false,
        uploadError: null,
      }));
    } catch {
      updateItem(localId, (item) => ({
        ...item,
        isUploading: false,
        uploadError: "Something went wrong while uploading.",
      }));
    }
  }

  async function save() {
    try {
      setSaving(true);
      setMessage(null);
      setError(null);

      const payload = {
        items: items.map((item) => ({
          title: item.title,
          instagramHandle: item.instagramHandle,

          imageUrl: item.imageUrl,
          imagePath: item.imagePath || null,
          imageAlt: item.imageAlt || null,
          imageWidth: item.imageWidth,
          imageHeight: item.imageHeight,
          imageFocalX: item.imageFocalX,
          imageFocalY: item.imageFocalY,

          postUrl: item.postUrl,
          caption: item.caption,
          sortOrder: item.sortOrder,
          isActive: item.isActive,
        })),
      };

      const res = await fetch("/api/admin/storefront/style-feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        setError(json?.error ?? "Failed to save homepage style feed.");
        return;
      }

      setMessage("Homepage style feed updated successfully.");
      await load();
    } catch {
      setError("Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Homepage style feed</h2>
          <p className="mt-1 text-sm text-black/60">
            Curate up to 4 editorial style feed cards for the homepage. Upload the
            image directly into Veilora, keep a fixed 4:5 crop, and drag the focal
            point to control the exact framing shown on storefront.
          </p>
        </div>

        <div className="text-sm text-black/50">{items.length} / 4 items</div>
      </div>

      {message && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {busy ? (
        <div className="mt-6 rounded-xl border border-black/10 bg-black/5 px-4 py-6 text-sm text-black/60">
          Loading homepage style feed...
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-4">
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-black/10 px-4 py-6 text-sm text-black/60">
                No homepage style feed items yet.
              </div>
            ) : null}

            {items.map((item, index) => (
              <div
                key={item.localId}
                className="rounded-2xl border border-black/10 bg-neutral-50 p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">Style feed item {index + 1}</div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.localId)}
                    className="text-sm text-red-600"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-4">
                    

                    <div>
                      <label
                        htmlFor={`style-feed-image-upload-${item.localId}`}
                        className="text-sm font-medium"
                      >
                        Upload image
                      </label>
                      <input
                        id={`style-feed-image-upload-${item.localId}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            void handleUpload(item.localId, file);
                          }
                          e.currentTarget.value = "";
                        }}
                        className="mt-2 block w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-black file:px-3 file:py-2 file:text-sm file:text-white"
                      />
                      <p className="mt-2 text-xs text-black/50">
                        JPG, PNG or WebP. Minimum 1200 × 1500. Recommended 1600 × 2000.
                      </p>

                      {item.isUploading && (
                        <div className="mt-2 text-xs text-black/60">
                          Uploading image...
                        </div>
                      )}

                      {item.uploadError && (
                        <div className="mt-2 text-xs text-red-600">
                          {item.uploadError}
                        </div>
                      )}

                      {item.imageWidth && item.imageHeight ? (
                        <div className="mt-2 text-xs text-black/45">
                          Uploaded image: {item.imageWidth} × {item.imageHeight}
                        </div>
                      ) : null}
                    </div>

                    <div>
  <label
    htmlFor={`style-feed-title-${item.localId}`}
    className="text-sm font-medium"
  >
    Title
  </label>
  <input
    id={`style-feed-title-${item.localId}`}
    type="text"
    value={item.title}
    onChange={(e) =>
      updateItem(item.localId, (current) => ({
        ...current,
        title: e.target.value,
        imageAlt: current.imageAlt || e.target.value,
      }))
    }
    placeholder="Summer evening in Paris"
    className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
  />
</div>

<div>
  <label
    htmlFor={`style-feed-instagram-handle-${item.localId}`}
    className="text-sm font-medium"
  >
    Instagram handle
  </label>
  <input
    id={`style-feed-instagram-handle-${item.localId}`}
    type="text"
    value={item.instagramHandle}
    onChange={(e) =>
      updateItem(item.localId, (current) => ({
        ...current,
        instagramHandle: e.target.value,
      }))
    }
    placeholder="@james"
    className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
  />
</div>

                    

                    <div>
                      <label
                        htmlFor={`style-feed-post-url-${item.localId}`}
                        className="text-sm font-medium"
                      >
                        Instagram post URL
                      </label>
                      <input
                        id={`style-feed-post-url-${item.localId}`}
                        type="text"
                        value={item.postUrl}
                        onChange={(e) =>
                          updateItem(item.localId, (current) => ({
                            ...current,
                            postUrl: e.target.value,
                          }))
                        }
                        placeholder="https://www.instagram.com/p/XXXXXXXXXXX/"
                        className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                      />
                      <p className="mt-2 text-xs text-black/50">
                        This is the link shoppers will open when they click the card.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor={`style-feed-caption-${item.localId}`}
                        className="text-sm font-medium"
                      >
                        Caption
                      </label>
                      <textarea
                        id={`style-feed-caption-${item.localId}`}
                        value={item.caption}
                        onChange={(e) =>
                          updateItem(item.localId, (current) => ({
                            ...current,
                            caption: e.target.value,
                            imageAlt:
                              current.imageAlt || e.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="Optional short caption"
                        className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`style-feed-image-alt-${item.localId}`}
                        className="text-sm font-medium"
                      >
                        Image alt text
                      </label>
                      <input
                        id={`style-feed-image-alt-${item.localId}`}
                        type="text"
                        value={item.imageAlt}
                        onChange={(e) =>
                          updateItem(item.localId, (current) => ({
                            ...current,
                            imageAlt: e.target.value,
                          }))
                        }
                        placeholder="Describe the image for accessibility"
                        className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor={`style-feed-order-${item.localId}`}
                          className="text-sm font-medium"
                        >
                          Display order
                        </label>
                        <input
                          id={`style-feed-order-${item.localId}`}
                          type="number"
                          min={0}
                          max={10}
                          value={item.sortOrder}
                          onChange={(e) =>
                            updateItem(item.localId, (current) => ({
                              ...current,
                              sortOrder: Number(e.target.value) || 0,
                            }))
                          }
                          className="mt-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="flex items-end">
                        <label
                          htmlFor={`style-feed-active-${item.localId}`}
                          className="inline-flex items-center gap-2 text-sm"
                        >
                          <input
                            id={`style-feed-active-${item.localId}`}
                            type="checkbox"
                            checked={item.isActive}
                            onChange={(e) =>
                              updateItem(item.localId, (current) => ({
                                ...current,
                                isActive: e.target.checked,
                              }))
                            }
                          />
                          Active
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <FocalPointPreview
                      imageUrl={item.imageUrl}
                      alt={item.imageAlt || item.caption || "Style feed preview"}
                      focalX={item.imageFocalX}
                      focalY={item.imageFocalY}
                      onChange={(x, y) =>
                        updateItem(item.localId, (current) => ({
                          ...current,
                          imageFocalX: x,
                          imageFocalY: y,
                        }))
                      }
                    />

                    <div className="rounded-2xl border border-black/10 bg-white p-3 text-xs text-black/55">
                      <div>
                        Focal point: <strong>{item.imageFocalX}%</strong> /{" "}
                        <strong>{item.imageFocalY}%</strong>
                      </div>
                      <div className="mt-1">
                        The admin preview uses the same 4:5 crop logic the homepage will use.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={addItem}
              disabled={items.length >= 4}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-50"
            >
              Add item
            </button>

            <button
              type="button"
              onClick={save}
              disabled={saving || hasUploadingItem}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-50"
            >
              {saving ? "Saving..." : hasUploadingItem ? "Wait for uploads..." : "Save style feed"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}