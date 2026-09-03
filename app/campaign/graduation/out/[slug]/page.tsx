import Link from "next/link";

const brands: Record<string, string> = {
  // GRADUATION COLLECTION
  "satin-draped-cape-dress": "Nayvah",
  "draped-evening-gown": "Laylah",
  "black-pleated-wrap-dress": "Zahra",
  "silk-occasion-dress": "Elara",
  "ivory-satin-wrap-dress": "Nura",
  "plum-tie-waist-dress": "Amara",

  // TRENDING THIS WEEK
  "chocolate-draped-dress": "Noirai",
  "ivory-cape-dress": "Nura",
  "chiffon-hijab-taupe": "Sera",
  "satin-draped-maxi-dress": "Nayvah",
};

export default async function CampaignRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const brand = brands[slug] ?? "the brand";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fcfbf8] px-6">
      <div className="text-center">

        {/* VEILORA MARK */}
        <Link
          href="/campaign/graduation"
          className="font-heading text-5xl text-[#7B2D3E]"
        >
          V
        </Link>

        {/* MESSAGE */}
        <h1 className="mx-auto mt-10 max-w-[650px] font-heading text-4xl leading-[1.15] text-[#252525] md:text-5xl">
          Redirecting you to{" "}
          <span className="italic">{brand}</span>
          <br />
          to complete your purchase
        </h1>

        {/* LOADING SPINNER */}
        <div className="mx-auto mt-12 h-9 w-9 animate-spin rounded-full border-2 border-black/10 border-t-[#7B2D3E]" />

        <p className="mt-6 text-xs text-black/40">
          You&apos;ll be redirected automatically.
        </p>

      </div>
    </main>
  );
}