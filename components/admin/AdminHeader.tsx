// C:\Users\Asiya\projects\dalra\components\admin\AdminHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

function NavLink({ href, label, icon, badge }: NavItem) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={[
        "group flex items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-all",
        active
          ? "bg-[#f2ece4] font-medium text-[#7B2D3E]"
          : "text-[#9a7e6f] hover:bg-[#f2ece4] hover:text-[#1a0a0e]",
      ].join(" ")}
    >
      <span className="flex items-center gap-2.5">
        <i
          className={`ti ${icon} text-[15px] ${active ? "text-[#7B2D3E]" : "text-[#c4a898] group-hover:text-[#7B2D3E]"}`}
          aria-hidden="true"
        />
        {label}
      </span>
      {badge && badge > 0 && !active ? (
        <span className="rounded-full bg-[#7B2D3E] px-2 py-0.5 text-[10px] font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <div className="mb-1 mt-4 px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#c4a898] first:mt-0">
      {title}
    </div>
  );
}

export function AdminHeader({
  unseenWaitlistCount = 0,
  unseenApplicationsCount = 0,
}: {
  unseenWaitlistCount?: number;
  unseenApplicationsCount?: number;
}) {
  const sections: NavSection[] = [
{
  title: "Personal",
  items: [
    { href: "/admin/personal/calendar", label: "Calendar", icon: "ti-calendar" },
    { href: "/admin/personal/notes", label: "Notes", icon: "ti-notebook" },
    { href: "/admin/personal/todos", label: "To-dos", icon: "ti-checkbox" },
  ],
},
    {
      title: "Overview",
      items: [
        { href: "/admin/analytics", label: "Analytics", icon: "ti-chart-bar" },
      ],
    },
    {
      title: "Catalogue",
      items: [
        { href: "/admin/products", label: "Products", icon: "ti-shirt" },
        { href: "/admin/import", label: "Import", icon: "ti-upload" },
        { href: "/admin/brands", label: "Brands", icon: "ti-building-store" },
        { href: "/admin/brand-invites", label: "Brand Invites", icon: "ti-mail" },
      ],
    },
    {
      title: "Community",
      items: [
        {
          href: "/admin/brands/applications",
          label: "Applications",
          icon: "ti-file-text",
          badge: unseenApplicationsCount,
        },
        {
          href: "/admin/waitlist",
          label: "Waitlist",
          icon: "ti-users",
          badge: unseenWaitlistCount,
        },
        { href: "/admin/newsletter", label: "Newsletter", icon: "ti-send" },
        { href: "/admin/taxonomy/requests", label: "Requests", icon: "ti-help-circle" },
      ],
    },
    {
  title: "Content",
  items: [
    { href: "/admin/navigation", label: "Navigation Promos", icon: "ti-speakerphone" },
    { href: "/admin/continents", label: "Continents", icon: "ti-map" },
    { href: "/admin/diary", label: "Diary", icon: "ti-pencil" },
    { href: "/admin/storefront", label: "Storefront", icon: "ti-layout" },
    { href: "/admin/merchandising", label: "Merchandising", icon: "ti-stars" },
  ],
},

  ];

  return (
    <div className="flex h-full flex-col px-3">
      <nav className="flex flex-col">
        {sections.map((section) => (
          <div key={section.title}>
            <SectionLabel title={section.title} />
            {section.items.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-[#e8ddd4] pt-3 pb-1">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-[#9a7e6f] transition-all hover:bg-[#f2ece4] hover:text-[#1a0a0e]"
        >
          <i className="ti ti-refresh text-[15px] text-[#c4a898]" aria-hidden="true" />
          Refresh
        </button>
      </div>
    </div>
  );
}