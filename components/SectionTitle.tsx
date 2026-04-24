// components/SectionTitle.tsx
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center">
      <h2 className="text-4xl font-semibold text-black">
        {children}
      </h2>
    </div>
  );
}