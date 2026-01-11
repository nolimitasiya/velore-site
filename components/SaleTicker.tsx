export function SaleTicker() {
  return (
    <div className="bg-black text-white overflow-hidden">
      <div className="py-2">
        <div className="flex whitespace-nowrap animate-marquee">
          {Array.from({ length: 30 }).map((_, i) => (
            <span
              key={i}
              className="mx-6 text-xl tracking-widest"
            >
              SALE
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
