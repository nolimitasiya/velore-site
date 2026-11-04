"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import FeedbackIssueForm from "@/components/feedback/FeedbackIssueForm";
import FeedbackIdeaForm from "@/components/feedback/FeedbackIdeaForm";
import { useFeedbackShopper } from "@/hooks/useFeedbackShopper";
import { useFeedbackProduct } from "@/components/feedback/FeedbackProductContext";

type FeedbackView = "CHOOSER" | "ISSUE" | "IDEA";

export default function FeedbackWidget() {
  const pathname = usePathname();
  const { productId } = useFeedbackProduct();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<FeedbackView>("CHOOSER");
  // Disabled until production database safety checks are complete.
const FEEDBACK_AUTH_LOOKUP_ENABLED = false;

const shopper = useFeedbackShopper(
  FEEDBACK_AUTH_LOOKUP_ENABLED && open
);

  const containerRef = useRef<HTMLDivElement>(null);

  function closeFeedback() {
    setOpen(false);
    setView("CHOOSER");
  }

  useEffect(() => {
    setOpen(false);
    setView("CHOOSER");
  }, [pathname]);

  useEffect(() => {
  function handleOpenFeedback() {
    setView("CHOOSER");
    setOpen(true);
  }

  window.addEventListener("veilora:open-feedback", handleOpenFeedback);

  return () => {
    window.removeEventListener(
      "veilora:open-feedback",
      handleOpenFeedback
    );
  };
}, []);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeFeedback();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeFeedback();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={`fixed z-[90] ${
        open
        ? "inset-x-4 bottom-4 md:inset-x-auto md:bottom-6 md:right-6"
        : "bottom-6 right-6"
      }`}
    >
      {open && (
        <div
  id="veilora-feedback-panel"
  role="dialog"
  aria-label="Veilora Club feedback"
  className="mb-3 flex max-h-[calc(100dvh-5rem)] w-full flex-col overflow-hidden rounded-2xl border border-[#e8ddd4] bg-white shadow-[0_12px_45px_rgba(45,24,30,0.15)] md:max-h-[calc(100dvh-7rem)] md:w-[340px]"
  >
          <div className="flex items-center justify-between border-b border-[#eee5dd] bg-[#fcfbf8] px-5 py-4">
            <div>
              <p className="font-heading text-xl text-[#7B2D3E]">
                Feedback
              </p>

              <p className="mt-1 text-xs text-[#8c7569]">
                Help us make Veilora Club better.
              </p>
            </div>

            <button
              type="button"
              onClick={closeFeedback}
              aria-label="Close feedback"
              className="rounded-full p-2 text-[#8c7569] transition hover:bg-[#eee5dd]"
            >
              ✕
            </button>
          </div>

          {view === "CHOOSER" && (
            <div className="space-y-3 p-4">
              <button
                type="button"
                onClick={() => setView("ISSUE")}
                className="w-full rounded-xl border border-[#eee5dd] p-4 text-left transition hover:border-[#7B2D3E] hover:bg-[#fcfbf8]"
              >
                <span className="block text-sm font-semibold text-[#7B2D3E]">
                  Report an Issue
                </span>

                <span className="mt-1 block text-xs leading-5 text-[#8c7569]">
                  Something not working as expected? Let us know.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setView("IDEA")}
                className="w-full rounded-xl border border-[#eee5dd] p-4 text-left transition hover:border-[#7B2D3E] hover:bg-[#fcfbf8]"
              >
                <span className="block text-sm font-semibold text-[#7B2D3E]">
                  Share an Idea
                </span>

                <span className="mt-1 block text-xs leading-5 text-[#8c7569]">
                  Have a suggestion? We'd love to hear it.
                </span>
              </button>
            </div>
          )}

         <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
 {view === "ISSUE" && (
  <FeedbackIssueForm
    onBack={() => setView("CHOOSER")}
    shopper={shopper}
    productId={productId}
  />
)}

{view === "IDEA" && (
  <FeedbackIdeaForm
    onBack={() => setView("CHOOSER")}
    shopper={shopper}
  />
)}
</div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          if (open) {
            closeFeedback();
          } else {
            setView("CHOOSER");
            setOpen(true);
          }
        }}
        aria-expanded={open}
        aria-controls="veilora-feedback-panel"
       className="hidden items-center gap-2 rounded-full border border-[#e8ddd4] bg-white px-5 py-3 text-sm font-medium text-[#7B2D3E] shadow-[0_5px_22px_rgba(45,24,30,0.12)] transition hover:border-[#7B2D3E] hover:shadow-lg md:flex"
      >
        <span aria-hidden="true">✎</span>
        Feedback
      </button>
    </div>
  );
}