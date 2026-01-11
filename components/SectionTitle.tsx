export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-8 text-center">
      <h2 className="text-xl tracking-widest text-black">{children}</h2>
    </div>
  );
}
