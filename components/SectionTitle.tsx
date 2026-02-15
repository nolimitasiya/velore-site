export function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative py-14 text-center">
      <div className="mx-auto mb-4 h-px w-16 bg-black/20" />

      <h2 className="font-heading text-2xl sm:text-3xl tracking-[0.25em] text-black">
        {children}
      </h2>

      <div className="mx-auto mt-4 h-px w-16 bg-black/20" />
    </div>
  );
}
