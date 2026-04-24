"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { HeaderPromo } from "@/lib/navigationPromos";

type NavItem = { label: string; href: string };

type PromoKey =
  | "CLOTHING"
  | "ACCESSORIES"
  | "OCCASION"
  | "NEW_IN"
  | "SHOP_BY_BRANDS"
  | "EDITORIAL"
  | "SALE";

type PromoMap = Record<PromoKey, HeaderPromo>;

const occasionLinks: NavItem[] = [
  { label: "Everyday", href: "/categories/occasion/everyday" },
  { label: "Workwear", href: "/categories/occasion/workwear" },
  { label: "Wedding Guest", href: "/categories/occasion/wedding_guest" },
  { label: "Wedding", href: "/categories/occasion/wedding" },
  { label: "Graduation", href: "/categories/occasion/graduation" },
  { label: "Eid", href: "/categories/occasion/eid" },
  { label: "Party", href: "/categories/occasion/party" },
  { label: "Formal", href: "/categories/occasion/formal" },
];

const saleLinks: NavItem[] = [
  { label: "All Sale", href: "/sale" },
  { label: "Sale Abayas", href: "/sale?type=ABAYA" },
  { label: "Sale Dresses", href: "/sale?type=DRESS" },
  { label: "Sale Skirts", href: "/sale?type=SKIRT" },
  { label: "Sale Tops", href: "/sale?type=TOP" },
  { label: "Sale Hijabs", href: "/sale?type=HIJAB" },
  { label: "Sale Activewear", href: "/sale?type=ACTIVEWEAR" },
  { label: "Sale Sets", href: "/sale?type=SETS" },
  { label: "Sale Maternity", href: "/sale?type=MATERNITY" },
  { label: "Sale Khimars", href: "/sale?type=KHIMAR" },
  { label: "Sale Jilbabs", href: "/sale?type=JILBAB" },
  { label: "Sale Coats & Jackets", href: "/sale?type=COATS_JACKETS" },
  { label: "Sale Hoodies & Sweatshirts", href: "/sale?type=HOODIE_SWEATSHIRT" },
  { label: "Sale Pants", href: "/sale?type=PANTS" },
  { label: "Sale Blazers", href: "/sale?type=BLAZER" },
  { label: "Sale T-Shirts", href: "/sale?type=T_SHIRT" },
  { label: "Sale Accessories", href: "/sale?type=ACCESSORIES" },  
];

const clothingLinks: NavItem[] = [
  { label: "Abayas", href: "/categories/clothing?type=ABAYA" },
  { label: "Dresses", href: "/categories/clothing?type=DRESS" },
  { label: "Sets", href: "/categories/clothing?type=SETS" },
  { label: "Tops", href: "/categories/clothing?type=TOP" },
  { label: "T-Shirts", href: "/categories/clothing?type=T_SHIRT" },
  { label: "Skirts", href: "/categories/clothing?type=SKIRT" },
  { label: "Pants", href: "/categories/clothing?type=PANTS" },
  { label: "Blazers", href: "/categories/clothing?type=BLAZER" },
  { label: "Coats & Jackets", href: "/categories/clothing?type=COATS_JACKETS" },
  { label: "Hoodies & Sweatshirts", href: "/categories/clothing?type=HOODIE_SWEATSHIRT" },
  { label: "Hijabs", href: "/categories/clothing?type=HIJAB" },
  { label: "Khimars", href: "/categories/clothing?type=KHIMAR" },
  { label: "Jilbabs", href: "/categories/clothing?type=JILBAB" },
  { label: "Activewear", href: "/categories/clothing?type=ACTIVEWEAR" },
  { label: "Maternity", href: "/categories/clothing?type=MATERNITY" },
];
const accessoriesLinks: NavItem[] = [
  { label: "Necklaces", href: "/categories/accessories?category=necklaces" },
  { label: "Earrings", href: "/categories/accessories?category=earrings" },
  { label: "Bracelets", href: "/categories/accessories?category=bracelets" },
  { label: "Rings", href: "/categories/accessories?category=rings" },
  { label: "Watches", href: "/categories/accessories?category=watches" },
];

const newInLinks: NavItem[] = [
  { label: "Latest arrivals", href: "/new-in" },
];

const brandLinks: NavItem[] = [
  { label: "All brands", href: "/brands" },
];

const editorialLinks: NavItem[] = [
  { label: "All Editorial", href: "/diary" },
];

const navItemWrapper = "flex items-center h-[48px] pb-3";

const navLink = (active: boolean) =>
  [
    "relative py-2 text-[15px] md:text-[16px] tracking-[0.08em] uppercase leading-none transition-colors duration-200",
    active ? "text-white" : "text-white/82 hover:text-white",
    "after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-px",
    "after:bg-white after:origin-center after:transition-transform after:duration-200",
    active ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100",
  ].join(" ");

const dropdownEyebrow =
  "text-[11px] uppercase tracking-[0.18em] text-black/45";
const dropdownGrid = "mt-5 grid grid-cols-2 gap-x-10 gap-y-3";
const dropdownItem =
  "text-[15px] text-black/78 transition-colors duration-200 hover:text-black";
const dropdownAside = "border-l border-black/10 pl-8 flex flex-col";
const dropdownImageWrap =
  "relative mb-5 aspect-[4/5] w-full overflow-hidden bg-black/5";
const dropdownImageOverlay =
  "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent p-4";
const dropdownImageKicker =
  "text-[10px] uppercase tracking-[0.16em] text-white/80";
const dropdownImageTitle = "mt-1 text-lg text-white";
const dropdownBlurb = "text-[13px] leading-6 text-black/55";
const dropdownCta =
  "mt-5 inline-flex w-fit border-b border-black pb-1 text-[12px] uppercase tracking-[0.14em] text-black transition-opacity hover:opacity-70";

function PromoAside({
  href,
  label,
  promo,
}: {
  href: string;
  label: string;
  promo: HeaderPromo;
}) {
  const ctaHref = promo.ctaHref || href;
  const ctaLabel = promo.ctaLabel || `View all ${label.toLowerCase()}`;
  const kicker = promo.kicker || `${label} Edit`;
  const title = promo.title || label;
  const blurb = promo.blurb || "";

  return (
    <div className={dropdownAside}>
      {promo.imageUrl ? (
        <Link href={ctaHref} className="group/image block">
          <div className={dropdownImageWrap}>
            <Image
              src={promo.imageUrl}
              alt={`${label} featured promo`}
              fill
              sizes="280px"
              className="object-cover transition-transform duration-500 group-hover/image:scale-[1.03]"
            />
            <div className={dropdownImageOverlay}>
              <div className={dropdownImageKicker}>{kicker}</div>
              <div className={dropdownImageTitle}>{title}</div>
            </div>
          </div>
        </Link>
      ) : (
        <div className="mb-5 rounded-2xl border border-black/10 bg-black/[0.02] p-5">
          <div className="text-[10px] uppercase tracking-[0.16em] text-black/45">
            {kicker}
          </div>
          <div className="mt-2 text-lg text-black">{title}</div>
        </div>
      )}

      <p className={dropdownBlurb}>{blurb}</p>

      <Link href={ctaHref} className={dropdownCta}>
        {ctaLabel}
      </Link>
    </div>
  );
}

function DropdownMenu({
  label,
  href,
  items,
  active,
  menuId,
  promo,
  compact = false,
}: {
  label: string;
  href: string;
  items: NavItem[];
  active: boolean;
  menuId: string;
  promo: HeaderPromo;
  compact?: boolean;
}) {
  const panelClass = [
    "absolute left-1/2 top-full z-50 -translate-x-1/2",
    "pt-4",
    compact ? "w-[560px]" : "w-[720px]",
    "border border-black/10 bg-white text-black",
    "shadow-[0_24px_80px_rgba(0,0,0,0.16)]",
    "opacity-0 pointer-events-none translate-y-2",
    "transition-all duration-200 ease-out",
    "group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0",
    "group-focus-within:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0",
  ].join(" ");

  const innerClass = compact
    ? "grid grid-cols-[0.9fr_1.1fr] gap-6 px-6 py-6"
    : "grid grid-cols-[1.15fr_0.85fr] gap-10 px-8 py-8";

  return (
    <div className={`${navItemWrapper} group relative`}>
      <Link href={href} className={navLink(active)} aria-controls={menuId}>
        <span className="inline-flex items-center gap-2">
          {label}
          <span className="text-[10px] text-white/45 transition-transform duration-200 group-hover:rotate-180">
            ▾
          </span>
        </span>
      </Link>

      <div id={menuId} className={panelClass}>
        <div className={innerClass}>
          <div>
            <div className={dropdownEyebrow}>Shop {label}</div>

            <div className={dropdownGrid}>
              {items.map((item) => (
                <Link
  key={item.href}
  href={item.href}
  className="whitespace-nowrap"
>
  {item.label}
</Link>
              ))}
            </div>
          </div>

          <PromoAside href={href} label={label} promo={promo} />
        </div>
      </div>
    </div>
  );
}

export default function HeaderNavClient({
  promos,
  brandItems,
}: {
  promos: PromoMap;
  brandItems: NavItem[];
}) {
  const pathname = usePathname();

  const isActiveStartsWith = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const isClothingActive = pathname.startsWith("/categories/clothing");
    const isAccessoriesActive = pathname.startsWith("/categories/accessories");
  const isOccasionActive = pathname.startsWith("/categories/occasion");
  const isEditorialActive = pathname === "/diary" || pathname.startsWith("/diary/");
  const isSaleActive = pathname.startsWith("/sale");
  

  return (
    <nav className="flex items-center justify-center gap-10">
      <DropdownMenu
        label="New In"
        href="/new-in"
        items={newInLinks}
        active={isActiveStartsWith("/new-in")}
        menuId="newin-menu"
        promo={promos.NEW_IN}
        compact
      />

      <DropdownMenu
        label="Clothing"
        href="/categories/clothing"
        items={clothingLinks}
        active={isClothingActive}
        menuId="clothing-menu"
        promo={promos.CLOTHING}
      />

            <DropdownMenu
        label="Accessories"
        href="/categories/accessories"
        items={accessoriesLinks}
        active={isAccessoriesActive}
        menuId="accessories-menu"
        promo={promos.ACCESSORIES}
        compact
      />

      <DropdownMenu
        label="Occasion"
        href="/categories/occasion"
        items={occasionLinks}
        active={isOccasionActive}
        menuId="occasion-menu"
        promo={promos.OCCASION}
      />

      <DropdownMenu
        label="Shop by Brands"
        href="/brands"
        items={brandItems}
        active={pathname === "/brands" || pathname.startsWith("/brands/")}
        menuId="brands-menu"
        promo={promos.SHOP_BY_BRANDS}
        compact
      />

      <DropdownMenu
        label="Editorial"
        href="/diary"
        items={editorialLinks}
        active={isEditorialActive}
        menuId="editorial-menu"
        promo={promos.EDITORIAL}
        compact
      />

      <DropdownMenu
        label="Sale"
        href="/sale"
        items={saleLinks}
        active={isSaleActive}
        menuId="sale-menu"
        promo={promos.SALE}
      />
    </nav>
  );
}