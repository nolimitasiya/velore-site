export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";
import BrandProfileForm from "@/components/brand/BrandProfileForm";

export default async function BrandProfilePage() {
  const { brandId } = await requireBrandContext();

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: {
      id: true,
      name: true,
      slug: true,
      coverImageUrl: true,
      coverImageFocalX: true,
      coverImageFocalY: true,
      
    },
  });

  if (!brand) {
    return <div className="text-sm text-black/60">Brand not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="mt-1 text-sm text-black/60">
          Add your brand cover image for the public Shop by Brands page.
        </p>
      </div>

      <BrandProfileForm
  initialName={brand.name}
  initialSlug={brand.slug}
  initialCoverImageUrl={brand.coverImageUrl}
  initialCoverImageFocalX={brand.coverImageFocalX}
  initialCoverImageFocalY={brand.coverImageFocalY}
/>
    </div>
  );
}