// components/analytics/CountryHeatmapGrid.tsx
type Row = { countryCode: string; clicks: number };

export default function CountryHeatmapGrid({
  rows,
  title = "Heatmap (top countries)",
  maxTiles = 60,
}: {
  rows: Row[];
  title?: string;
  maxTiles?: number;
}) {
  const data = rows.slice(0, maxTiles);
  const max = Math.max(1, ...data.map((r) => r.clicks));

  return (
    <div className="rounded-2xl border bg-white overflow-hidden">
      <div className="px-4 py-3 border-b">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-neutral-500">
          Visual intensity is relative to the max in this list.
        </div>
      </div>

      <div className="p-4">
        {data.length === 0 ? (
          <div className="text-sm text-neutral-500">No geo clicks yet.</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-10 gap-2">
            {data.map((r) => {
              const pct = r.clicks / max; // 0..1
              const opacity = Math.max(0.12, Math.min(0.9, pct)); // readable floor

              return (
                <div
                  key={r.countryCode}
                  title={`${r.countryCode}: ${r.clicks} clicks`}
                  className="rounded-xl border px-2 py-2 text-center text-xs font-medium"
                  style={{
                    backgroundColor: `rgba(0,0,0,${opacity})`,
                    color: opacity > 0.45 ? "white" : "black",
                  }}
                >
                  <div className="leading-none">{r.countryCode}</div>
                  <div className="mt-1 text-[10px] opacity-90">{r.clicks}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}