import Link from "next/link";

type Status = "ok" | "invalid" | "missing";

export default function ConfirmPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status = (searchParams?.status ?? "missing") as Status;

  const copy: Record<Status, { title: string; body: string }> = {
    ok: {
      title: "You’re confirmed 💌",
      body: "Thanks — you’re officially subscribed.",
    },
    invalid: {
      title: "Link expired or already used",
      body: "Please subscribe again to get a fresh confirmation link.",
    },
    missing: {
      title: "Missing confirmation link",
      body: "Please open the confirmation link from your email, or subscribe again to get a new one.",
    },
  };

  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">{copy[status].title}</h1>
      <p className="mt-3 text-sm text-black/70">{copy[status].body}</p>

      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm text-white"
        >
          Back home
        </Link>
        <Link
          href="/browse"
          className="inline-flex items-center justify-center rounded-xl border border-black/10 px-4 py-2 text-sm"
        >
          Browse
        </Link>
      </div>
    </div>
  );
}
