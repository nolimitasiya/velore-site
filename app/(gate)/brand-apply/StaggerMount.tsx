"use client";

import { useEffect, useRef, useState } from "react";

export default function StaggerMount({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const root = ref.current;
    if (!root) return;

    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-stagger]"));
    items.forEach((el, i) => {
      el.style.transitionDelay = `${i * 70}ms`; // tweak speed here
    });
  }, [mounted]);

  return (
    <div
      ref={ref}
      className={[
        "transition-all duration-700 ease-out",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
