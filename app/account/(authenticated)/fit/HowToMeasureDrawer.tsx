"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

const MEASUREMENT_GUIDE = [
  {
    number: "01",
    title: "Height",
    description:
      "Stand straight without shoes and measure from the top of your head to the floor.",
  },
  {
    number: "02",
    title: "Bust",
    description:
      "Measure around the fullest part of your bust, keeping the tape level around your body.",
  },
  {
    number: "03",
    title: "Waist",
    description:
      "Measure around your natural waist, keeping the tape comfortably close to your body.",
  },
  {
    number: "04",
    title: "Hips",
    description:
      "Measure around the fullest part of your hips, keeping the tape level.",
  },
  {
    number: "05",
    title: "Preferred maxi length",
    description:
      "Measure from the highest point of your shoulder down to where you prefer a full-length dress, abaya or jilbab to finish.",
  },
] as const;

export default function HowToMeasureDrawer({
  open,
  onClose,
}: Props) {
  const closeButtonRef =
    useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previouslyFocused =
  document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;

requestAnimationFrame(() => {
  closeButtonRef.current?.focus();
});

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-[100] ${
        open
          ? "pointer-events-auto"
          : "pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close measurement guide"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={`absolute inset-0 bg-black/25 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="measurement-guide-title"
        className={`absolute right-0 top-0 h-full w-full overflow-y-auto bg-[#fbf8f4] shadow-2xl transition-transform duration-300 ease-out sm:max-w-[480px] ${
          open
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >
        <div className="flex min-h-full flex-col">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e8ddd4] bg-[#fbf8f4]/95 px-6 py-5 backdrop-blur sm:px-8">
            <div>
              <h2
                id="measurement-guide-title"
                className="mt-1 font-heading text-2xl text-[#1a0a0e]"
              >
                How to measure
              </h2>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close measurement guide"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e8ddd4] text-xl font-light text-[#1a0a0e] transition hover:border-[#7B2D3E] hover:text-[#7B2D3E]"
            >
              ×
            </button>
          </div>

          <div className="px-6 py-8 sm:px-8">
            <p className="max-w-sm text-sm leading-6 text-[#8b7768]">
              Use a soft measuring tape and keep it
              comfortably close to your body without
              pulling it tight.
            </p>

            <div className="mt-8 border-y border-[#eee5de] py-6">
  <img
    src="/images/fit/how-to-measure.png"
    alt="Veilora guide showing where to measure height, bust, waist, hips and preferred maxi length"
    className="mx-auto h-auto w-full"
  />
</div>

            <div className="mt-6 divide-y divide-[#eee5de]">
              {MEASUREMENT_GUIDE.map((item) => (
                <div
                  key={item.number}
                  className="grid grid-cols-[36px_1fr] gap-3 py-5"
                >
                  <span className="text-xs text-[#7B2D3E]">
                    {item.number}
                  </span>

                  <div>
                    <h3 className="text-sm font-medium text-[#1a0a0e]">
                      {item.title}
                    </h3>

                    <p className="mt-1.5 text-xs leading-5 text-[#8b7768]">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-8 border-t border-[#eee5de] pt-6 text-xs leading-5 text-[#a89280]">
              You don&apos;t need to add every
              measurement at once. Save what you know
              and return to My Fit whenever you&apos;d
              like to update your profile.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}