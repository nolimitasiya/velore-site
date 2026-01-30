import Link from "next/link";

export default function ConfirmPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const { status } = searchParams;
  const title =
    status === "ok"
      ? "You’re confirmed 💌"
      : status === "invalid"
      ? "Link expired or already used"
      : "Missing confirmation link";

  const body =
    status === "ok"
      ? "Thanks — you’re officially subscribed."
      : "Please try subscribing again to get a fresh confirmation link.";

  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-3 text-sm text-black/70">{body}</p>

      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm text-white"
        >
          Back home
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl border border-black/10 px-4 py-2 text-sm"
        >
          Browse
        </Link>
      </div>
    </div>
  );
}
