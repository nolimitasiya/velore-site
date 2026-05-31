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
    <div className="flex min-h-screen bg-[#faf8f4]">
      <BrandHeader brandName={brand?.name ?? "Brand Portal"} />
      <main className="flex-1 overflow-y-auto px-8 py-8 bg-[#faf8f4]">
        {children}
      </main>
    </div>
  </BrandShell>
);
}