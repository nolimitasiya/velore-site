"use client";

import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "@vnedyalk0v/react19-simple-maps";
import { scaleLinear } from "d3-scale";

// ✅ Import topology directly (no fetching)
import worldTopo from "@/lib/geo/world-50m.json";

type Props = {
  title?: string;
  // IMPORTANT: for world-atlas, keys should match geo.id (numeric)
  data: Record<string, number>;
};

export default function WorldChoropleth({ title = "World clicks heatmap", data }: Props) {
  const [hover, setHover] = useState<{ name: string; clicks: number } | null>(null);

  const values = useMemo(() => Object.values(data), [data]);
  const max = Math.max(0, ...values);

  const color = useMemo(() => {
    return scaleLinear<string>()
      .domain([0, Math.max(1, max)])
      .range(["#f3f4f6", "#111827"]);
  }, [max]);

  return (
    <div className="rounded-2xl border bg-white overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-xs text-neutral-500">
            {max > 0 ? `Max: ${max} clicks` : "No geo clicks yet"}
          </div>
        </div>

        {hover ? (
          <div className="text-xs text-neutral-600">
            <span className="font-medium">{hover.name}</span>: {hover.clicks}
          </div>
        ) : (
          <div className="text-xs text-neutral-400">Hover a country</div>
        )}
      </div>

      <div className="h-[420px] w-full">
        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={{ scale: 190 }}
          style={{ width: "100%", height: "100%" }}
        >
          {/* ✅ Pass the imported JSON object */}
          <Geographies geography={worldTopo as any}>
            {({ geographies }) =>
              geographies.map((geo) => {
                // world-atlas uses numeric ids (e.g. 826 for GB)
                const key = String(geo.id ?? "");
                const clicks = data[key] ?? 0;

                // ✅ Debug: confirm GB is being found
                if (key === "826") console.log("GB matched clicks:", clicks);

                const name = String(geo.properties?.name || geo.properties?.NAME || key || "Unknown");

                return (
                  <Geography
                    key={`${geo.id ?? "x"}-${String(geo.properties?.name ?? geo.rsmKey)}`}
                    geography={geo}
                    fill={clicks > 0 ? color(clicks) : "#f3f4f6"}
                    stroke="#e5e7eb"
                    strokeWidth={0.4}
                    onMouseEnter={() => setHover({ name, clicks })}
                    onMouseLeave={() => setHover(null)}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none" },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>
    </div>
  );
}