import BrandShell from "@/components/BrandShell";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { requireBrandContext } from "@/lib/auth/BrandSession";
import { getCurrentBrand } from "@/lib/brand/getCurrentBrand";

export const dynamic = "force-dynamic";

export default async function BrandAuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireBrandContext();
  const brand = await getCurrentBrand();

  return (
    <BrandShell brandName={brand?.name ?? "Brand Portal"}>
      <div className="space-y-8">
        <BrandHeader brandName={brand?.name ?? "Brand Portal"} />
        {children}
      </div>
    </BrandShell>
  );
}