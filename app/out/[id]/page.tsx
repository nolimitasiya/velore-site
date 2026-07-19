import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import RedirectClient from "./RedirectClient";

export const dynamic = "force-dynamic";

type OutPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
};

export default async function OutPage({
  params,
  searchParams,
}: OutPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      brand: {
        select: {
          name: true,
          affiliateStatus: true,
        },
      },
    },
  });

  if (
    !product ||
    product.brand?.affiliateStatus !== "ACTIVE"
  ) {
    notFound();
  }

  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(
    resolvedSearchParams
  )) {
    if (typeof value === "string") {
      query.set(key, value);
    }

    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    }
  }

  return (
    <RedirectClient
      productId={id}
      brandName={product.brand.name}
      trackingQuery={query.toString()}
    />
  );
}