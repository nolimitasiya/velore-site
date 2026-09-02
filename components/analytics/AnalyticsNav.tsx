"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    label: "Overview",
    href: "/admin/analytics",
  },
  {
    label: "Veilora Index",
    href: "/admin/analytics/veilora-index",
  },
  {
    label: "Insights",
    href: "/admin/analytics/insights",
  },
  {
    label: "Audience",
    href: "/admin/analytics/audience",
  },
  {
    label: "Commerce",
    href: "/admin/analytics/commerce",
  },
];

export default function AnalyticsNav() {
  const pathname = usePathname();

  return (
    <nav className="overflow-x-auto">
      <div className="inline-flex min-w-max items-center gap-1 rounded-2xl border border-black/10 bg-white p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {items.map((item) => {
          const active =
            item.href === "/admin/analytics"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "rounded-xl px-4 py-2 text-sm font-medium transition",
                active
                  ? "bg-[#7B2D3E] text-white shadow-sm"
                  : "text-neutral-500 hover:bg-[#fdf7f4] hover:text-[#7B2D3E]",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}