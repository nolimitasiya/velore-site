"use client";

import { useEffect, useRef, useState } from "react";

export default function StickyHeader({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;

      // Always show at very top
      if (y < 10) {
        setHidden(false);
        lastY.current = y;
        return;
      }

      // Scroll down -> hide (with a small threshold so it doesn't flicker)
      if (delta > 8) setHidden(true);

      // Scroll up -> show
      if (delta < -8) setHidden(false);

      lastY.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={[
        "sticky top-0 z-50 will-change-transform",
        "transition-transform duration-200",
        hidden ? "-translate-y-full" : "translate-y-0",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
