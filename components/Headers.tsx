import Link from "next/link";

export function Header() {
  return (
    <header className="w-full border-b border-black/20 bg-[#eee]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="w-[120px]" />
        <Link
          href="/"
          className="text-3xl tracking-[0.35em] font-light text-black"
          aria-label="Veilora Club home"
        >
          Veilora Club
        </Link>

        <div className="w-[120px] flex justify-end">
          <button
            className="rounded-full border border-black/30 px-3 py-1 text-sm text-black/70 hover:text-black"
            aria-label="Search"
            type="button"
          >
            Search
          </button>
        </div>
      </div>
    </header>
  );
}
