import { requireAdminSession } from "@/lib/auth/AdminSession";
import DiaryPostForm from "../DiaryPostForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewDiaryPostPage() {
  await requireAdminSession();

  return (
    <DiaryPostForm
      mode="create"
      initialValues={{
        title: "",
        slug: "",
        editorName: "",
        excerpt: "",
        coverImageUrl: "",
        coverImageAlt: "",
        contentHtml: "",
        shopSectionEyebrow: "",
        shopSectionTitle: "",
        shopSectionSubtitle: "",
        relatedProducts: [],
        status: "DRAFT",
      }}
    />
  );
}