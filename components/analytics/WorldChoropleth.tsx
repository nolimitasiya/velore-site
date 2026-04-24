"use client";

import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "@vnedyalk0v/react19-simple-maps";
import { scaleLinear } from "d3-scale";
import worldTopo from "@/lib/geo/world-50m.json";

type Props = {
  title?: string;
  data: Record<string, number>;
};

function formatClicks(n: number) {
  return new Intl.NumberFormat("en-GB").format(n);
}

export default function WorldChoropleth({
  title = "World clicks heatmap",
  data,
}: Props) {
  const [hover, setHover] = useState<{ name: string; clicks: number } | null>(null);

  const values = useMemo(() => Object.values(data), [data]);
  const max = Math.max(0, ...values);

  const color = useMemo(() => {
    return scaleLinear<string>()
      .domain([0, Math.max(1, max * 0.2), Math.max(1, max)])
      .range(["#f3ede2", "#c7ad84", "#2b241d"]);
  }, [max]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-black/6 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/6 px-4 py-4 md:px-5">
        <div>
          <div className="font-semibold text-neutral-950">{title}</div>
          <div className="mt-1 text-xs text-neutral-500">
            {max > 0 ? `Max market volume: ${formatClicks(max)} clicks` : "No geo clicks yet"}
          </div>
        </div>

        <div className="min-w-[160px] text-right">
          {hover ? (
            <>
              <div className="text-sm font-medium text-neutral-900">{hover.name}</div>
              <div className="text-xs text-neutral-500">{formatClicks(hover.clicks)} clicks</div>
            </>
          ) : (
            <>
              <div className="text-sm font-medium text-neutral-400">Hover a country</div>
              <div className="text-xs text-neutral-400">to inspect volume</div>
            </>
          )}
        </div>
      </div>

      <div className="bg-[radial-gradient(circle_at_top,#fcfaf5_0%,#f7f2e8_45%,#f4efe6_100%)] px-2 py-4 md:px-4">
        <div className="h-[430px] w-full">
          <ComposableMap
            projection="geoEqualEarth"
            projectionConfig={{ scale: 188 }}
            style={{ width: "100%", height: "100%" }}
          >
            <Geographies geography={worldTopo as any}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const key = String(geo.id ?? "");
                  const clicks = data[key] ?? 0;
                  const name = String(
                    geo.properties?.name || geo.properties?.NAME || key || "Unknown"
                  );

                  return (
                    <Geography
                      key={`${geo.id ?? "x"}-${String(geo.properties?.name ?? geo.rsmKey)}`}
                      geography={geo}
                      fill={clicks > 0 ? color(clicks) : "#efe8dc"}
                      stroke="#ffffff"
                      strokeWidth={0.5}
                      onMouseEnter={() => setHover({ name, clicks })}
                      onMouseLeave={() => setHover(null)}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none", filter: "brightness(0.98)" },
                        pressed: { outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        </div>

        <div className="mt-2 flex items-center justify-between gap-4 px-3 pb-1">
          <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
            Lower volume
          </div>

          <div className="flex h-2.5 flex-1 overflow-hidden rounded-full border border-black/5">
            <div className="h-full flex-1 bg-[#f3ede2]" />
            <div className="h-full flex-1 bg-[#dbc8ab]" />
            <div className="h-full flex-1 bg-[#c7ad84]" />
            <div className="h-full flex-1 bg-[#8c7452]" />
            <div className="h-full flex-1 bg-[#2b241d]" />
          </div>

          <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
            Higher volume
          </div>
        </div>
      </div>
    </div>
  );
}