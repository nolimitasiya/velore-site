// C:\Users\Asiya\projects\dalra\app\brand\(authed)\profile\page.tsx
// CHANGES: pass new shipping/returns props to BrandProfileForm

import { requireBrandContext } from "@/lib/auth/BrandSession";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import BrandProfileForm from "@/components/brand/BrandProfileForm";

export const dynamic = "force-dynamic";

export default async function BrandProfilePage() {
  let brandId: string;
  try {
    const ctx = await requireBrandContext();
    brandId = ctx.brandId;
  } catch {
    redirect("/brand/login");
  }

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: {
      id: true,
      name: true,
      slug: true,
      instagramHandle: true,
      coverImageUrl: true,
      coverImageFocalX: true,
      coverImageFocalY: true,
      shippingDomestic: true,
      shippingInternational: true,
      returnWindowDays: true,
      returnsPaidBy: true,
    },
  });

  if (!brand) redirect("/brand/login");

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Brand profile</h1>
      <BrandProfileForm
        initialName={brand.name}
        initialSlug={brand.slug}
        initialInstagramHandle={brand.instagramHandle}
        initialCoverImageUrl={brand.coverImageUrl}
        initialCoverImageFocalX={brand.coverImageFocalX}
        initialCoverImageFocalY={brand.coverImageFocalY}
        initialShippingDomestic={brand.shippingDomestic}
        initialShippingInternational={brand.shippingInternational}
        initialReturnWindowDays={brand.returnWindowDays}
        initialReturnsPaidBy={brand.returnsPaidBy as any}
      />
    </main>
  );
}
