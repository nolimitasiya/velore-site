"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  imageUrl: string;
  brandName: string;
  focalX: number;
  focalY: number;
  onChange: (next: { focalX: number; focalY: number }) => void;
};

type Size = { width: number; height: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function CoverImagePositionEditor({
  imageUrl,
  brandName,
  focalX,
  focalY,
  onChange,
}: Props) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [frameSize, setFrameSize] = useState<Size>({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState<Size>({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const hasSizes =
    frameSize.width > 0 &&
    frameSize.height > 0 &&
    naturalSize.width > 0 &&
    naturalSize.height > 0;

  useEffect(() => {
  const element = frameRef.current;
  if (!element) return;

  function updateSize(target: HTMLDivElement) {
    const rect = target.getBoundingClientRect();
    setFrameSize({
      width: rect.width,
      height: rect.height,
    });
  }

  updateSize(element);

  const ro = new ResizeObserver(() => updateSize(element));
  ro.observe(element);

  return () => ro.disconnect();
}, []);

  const coverMetrics = useMemo(() => {
    if (!hasSizes) {
      return {
        renderWidth: 0,
        renderHeight: 0,
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0,
      };
    }

    const scale = Math.max(
      frameSize.width / naturalSize.width,
      frameSize.height / naturalSize.height
    );

    const renderWidth = naturalSize.width * scale;
    const renderHeight = naturalSize.height * scale;

    const minX = frameSize.width - renderWidth;
    const maxX = 0;

    const minY = frameSize.height - renderHeight;
    const maxY = 0;

    return {
      renderWidth,
      renderHeight,
      minX,
      maxX,
      minY,
      maxY,
    };
  }, [frameSize, naturalSize, hasSizes]);

  const offset = useMemo(() => {
    if (!hasSizes) return { x: 0, y: 0 };

    const { renderWidth, renderHeight, minX, minY } = coverMetrics;

    const x =
      renderWidth <= frameSize.width
        ? (frameSize.width - renderWidth) / 2
        : (focalX / 100) * (frameSize.width - renderWidth);

    const y =
      renderHeight <= frameSize.height
        ? (frameSize.height - renderHeight) / 2
        : (focalY / 100) * (frameSize.height - renderHeight);

    return {
      x: clamp(x, minX, 0),
      y: clamp(y, minY, 0),
    };
  }, [coverMetrics, focalX, focalY, frameSize, hasSizes]);

  function updateFromOffset(nextX: number, nextY: number) {
    const { renderWidth, renderHeight, minX, minY } = coverMetrics;

    let newFocalX = 50;
    let newFocalY = 50;

    if (renderWidth > frameSize.width) {
      newFocalX = (nextX / (frameSize.width - renderWidth)) * 100;
    }

    if (renderHeight > frameSize.height) {
      newFocalY = (nextY / (frameSize.height - renderHeight)) * 100;
    }

    onChange({
      focalX: clamp(newFocalX, 0, 100),
      focalY: clamp(newFocalY, 0, 100),
    });
  }

  function beginDrag(clientX: number, clientY: number) {
    if (!hasSizes) return;

    const startMouse = { x: clientX, y: clientY };
    const startOffset = { ...offset };

    setIsDragging(true);

    function onMove(moveX: number, moveY: number) {
      const dx = moveX - startMouse.x;
      const dy = moveY - startMouse.y;

      const nextX = clamp(startOffset.x + dx, coverMetrics.minX, coverMetrics.maxX);
      const nextY = clamp(startOffset.y + dy, coverMetrics.minY, coverMetrics.maxY);

      updateFromOffset(nextX, nextY);
    }

    function handleMouseMove(e: MouseEvent) {
      e.preventDefault();
      onMove(e.clientX, e.clientY);
    }

    function handleTouchMove(e: TouchEvent) {
      if (!e.touches[0]) return;
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    }

    function endDrag() {
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", endDrag);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", endDrag);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", endDrag);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", endDrag);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">Preview</div>
        <div className="text-xs text-black/50">
          Drag image to reposition
        </div>
      </div>

      <div
        ref={frameRef}
        className="relative h-[340px] w-full overflow-hidden rounded-3xl bg-[#d9d3ca] select-none"
        onMouseDown={(e) => beginDrag(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          if (!e.touches[0]) return;
          beginDrag(e.touches[0].clientX, e.touches[0].clientY);
        }}
      >
        {imageUrl ? (
          <>
            <img
              ref={imgRef}
              src={imageUrl}
              alt={`${brandName} cover preview`}
              draggable={false}
              onLoad={(e) => {
                const img = e.currentTarget;
                setNaturalSize({
                  width: img.naturalWidth,
                  height: img.naturalHeight,
                });
              }}
              className="pointer-events-none absolute max-w-none"
              style={{
                width: `${coverMetrics.renderWidth}px`,
                height: `${coverMetrics.renderHeight}px`,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                opacity: hasSizes ? 1 : 0,
              }}
            />

            <div className="absolute inset-0 bg-black/25" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-[#b8ab9a] to-[#d8d0c5]" />
        )}

        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
          <span className="text-3xl font-semibold tracking-[0.18em] text-white md:text-5xl">
            {brandName}
          </span>
        </div>

        {imageUrl && (
          <div
            className={`absolute inset-0 ring-1 ring-inset ${
              isDragging ? "ring-white/40" : "ring-transparent"
            } rounded-3xl`}
          />
        )}
      </div>

      <p className="text-xs text-black/50">
        Best results with wide landscape images, such as 1600×900 or 2000×1200.
      </p>
    </div>
  );
}