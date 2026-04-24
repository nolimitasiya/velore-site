import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import DiaryPostForm from "../DiaryPostForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditDiaryPostPage({ params }: PageProps) {
  await requireAdminSession();
  const { id } = await params;

  const post = await prisma.diaryPost.findUnique({
    where: { id },
    include: {
      relatedProducts: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: {
            include: {
              brand: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
              images: {
                orderBy: { sortOrder: "asc" },
                take: 1,
                select: {
                  url: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!post) notFound();

  return (
    <DiaryPostForm
      mode="edit"
            initialValues={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        editorName: post.editorName ?? "",
        excerpt: post.excerpt ?? "",
        coverImageUrl: post.coverImageUrl ?? "",
        coverImageAlt: post.coverImageAlt ?? "",
        contentHtml: post.contentHtml ?? "",
        shopSectionEyebrow: post.shopSectionEyebrow ?? "",
        shopSectionTitle: post.shopSectionTitle ?? "",
        shopSectionSubtitle: post.shopSectionSubtitle ?? "",
        relatedProducts: post.relatedProducts.map(({ product }) => ({
          id: product.id,
          title: product.title,
          slug: product.slug,
          price: product.price ? product.price.toString() : null,
          currency: product.currency,
          isActive: product.isActive,
          publishedAt: product.publishedAt ? product.publishedAt.toISOString() : null,
          status: product.status,
          brand: {
            id: product.brand.id,
            name: product.brand.name,
            slug: product.brand.slug,
          },
          imageUrl: product.images[0]?.url ?? null,
        })),
        status: post.status,
      }}
    />
  );
}