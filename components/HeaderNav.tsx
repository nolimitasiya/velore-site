import { getHeaderPromos, getHeaderBrandNavItems } from "@/lib/navigationPromos";
import HeaderNavClient from "@/components/HeaderNavClient";

export default async function HeaderNav() {
  const [promos, brandItems] = await Promise.all([
    getHeaderPromos(),
    getHeaderBrandNavItems(),
  ]);

  return <HeaderNavClient promos={promos} brandItems={brandItems} />;
}