import Link from "next/link";

export default function DiaryPostNotFound() {
  return (
    <main className="bg-white text-black">
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-black/50">
          Veilora Diary
        </p>
        <h1 className="mt-3 font-display text-4xl">Post not found</h1>
        <p className="mt-4 max-w-xl text-black/65">
          The article you are looking for is unavailable or has not been published.
        </p>
        <Link
          href="/diary"
          className="mt-8 inline-flex rounded-full border border-black px-5 py-3 text-sm transition hover:bg-black hover:text-white"
        >
          Back to diary
        </Link>
      </div>
    </main>
  );
}