"use client";

import {
  useState,
} from "react";

type TrendPoint = {
  date: string;
  value: number;
};

export default function MetricTrendChart({
  title,
  subtitle,
  data,
  range,
}: {
  title: string;
  subtitle: string;
  data: TrendPoint[];
  range?: string;
}) {
  const [
    hoveredIndex,
    setHoveredIndex,
  ] = useState<number | null>(
    null
  );

  const width = 700;
  const height = 240;

  const paddingX = 28;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth =
    width - paddingX * 2;

  const chartHeight =
    height -
    paddingTop -
    paddingBottom;

  const maxValue = Math.max(
    1,
    ...data.map(
      (point) => point.value
    )
  );

  const slotWidth =
    data.length > 0
      ? chartWidth /
        data.length
      : chartWidth;

  const barWidth = Math.max(
    2,
    Math.min(
      18,
      slotWidth * 0.7
    )
  );

  const bars =
    data.map(
      (point, index) => {
        const barHeight =
          point.value === 0
            ? 0
            : Math.max(
                3,
                (point.value /
                  maxValue) *
                  chartHeight
              );

        const x =
          paddingX +
          index *
            slotWidth +
          (slotWidth -
            barWidth) /
            2;

        const y =
          paddingTop +
          chartHeight -
          barHeight;

        return {
          ...point,
          x,
          y,
          barHeight,
        };
      }
      
    );

    const labelIndexes = (() => {
  if (data.length <= 1) {
    return [0];
  }

  // All time:
  // show one label for each month.
  if (range === "all") {
  const indexes: number[] = [];

  let previousMonth:
    string | null = null;

  data.forEach(
    (point, index) => {
      const month =
        point.date.replace(
          /^\d+\s+/,
          ""
        );

      if (
        month !==
        previousMonth
      ) {
        indexes.push(index);

        previousMonth =
          month;
      }
    }
  );

  // If the first month begins very
  // close to the second month,
  // hide its axis label to prevent
  // the labels overlapping.
  if (
    indexes.length >= 2
  ) {
    const firstX =
      indexes[0] *
      slotWidth;

    const secondX =
      indexes[1] *
      slotWidth;

    if (
      secondX -
        firstX <
      458
    ) {
      indexes.shift();
    }
  }

  return indexes;
}
  // Shorter ranges:
  // show evenly spaced dates.
  const desiredLabels =
    Math.min(
      5,
      data.length
    );

  return Array.from(
    {
      length:
        desiredLabels,
    },
    (_, index) =>
      Math.round(
        (index /
          Math.max(
            1,
            desiredLabels -
              1
          )) *
          (data.length - 1)
      )
  );
})();

  const hovered =
    hoveredIndex !== null
      ? bars[hoveredIndex]
      : null;

  return (
    <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
      <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
        <div className="text-sm font-semibold text-black">
          {title}
        </div>

        <div className="mt-0.5 text-xs text-neutral-400">
          {subtitle}
        </div>
      </div>

      <div className="relative p-5">
        {hovered && (
          <div
            className="pointer-events-none absolute z-10 rounded-xl border border-black/10 bg-white px-3 py-2 shadow-lg"
            style={{
              left: `${
                ((hovered.x +
                  barWidth / 2) /
                  width) *
                100
              }%`,
              top: 12,
              transform:
                "translateX(-50%)",
            }}
          >
            <div className="text-xs font-medium text-black">
              {hovered.date}
            </div>

            <div className="mt-0.5 text-xs text-neutral-500">
              {hovered.value}{" "}
              signup
              {hovered.value === 1
                ? ""
                : "s"}
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label={title}
          onMouseLeave={() =>
            setHoveredIndex(
              null
            )
          }
        >
          <line
            x1={paddingX}
            y1={
              paddingTop +
              chartHeight
            }
            x2={
              width -
              paddingX
            }
            y2={
              paddingTop +
              chartHeight
            }
            stroke="currentColor"
            className="text-black/10"
          />

          {bars.map(
            (
              point,
              index
            ) => {
              const active =
                hoveredIndex ===
                index;

              return (
                <g
                  key={`${point.date}-${index}`}
                  onMouseEnter={() =>
                    setHoveredIndex(
                      index
                    )
                  }
                >
                  {/* Invisible hover area */}
                  <rect
                    x={
                      paddingX +
                      index *
                        slotWidth
                    }
                    y={paddingTop}
                    width={
                      slotWidth
                    }
                    height={
                      chartHeight
                    }
                    fill="transparent"
                  />

                  {point.value >
                    0 && (
                    <rect
                      x={
                        point.x
                      }
                      y={
                        point.y
                      }
                      width={
                        barWidth
                      }
                      height={
                        point.barHeight
                      }
                      rx="2"
                      fill={
                        active
                          ? "#5F1F2F"
                          : "#7B2D3E"
                      }
                    />
                  )}
                </g>
              );
            }
          )}

          {bars.length
  ? labelIndexes.map(
      (index) => {
        const point =
          bars[index];

        const x =
          point.x +
          barWidth / 2;

        const first =
          index === 0;

        const last =
          index ===
          bars.length - 1;

        return (
          <g
            key={`label-${index}`}
          >
            <line
              x1={x}
              y1={
                paddingTop +
                chartHeight
              }
              x2={x}
              y2={
                paddingTop +
                chartHeight +
                5
              }
              stroke="currentColor"
              className="text-black/15"
            />

            <text
              x={x}
              y={
                height -
                8
              }
              textAnchor={
                first
                  ? "start"
                  : last
                    ? "end"
                    : "middle"
              }
              fontSize="11"
              fill="currentColor"
              className="text-neutral-400"
            >
              {range === "all"
  ? point.date.replace(
      /^\d+\s+/,
      ""
    )
  : point.date}
            </text>
          </g>
        );
      }
    )
  : null}
        </svg>
      </div>
    </div>
  );
}