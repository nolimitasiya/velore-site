type TrendPoint = {
  date: string;
  value: number;
};

export default function MetricTrendChart({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: TrendPoint[];
}) {
  const width = 700;
  const height = 220;

  const paddingX = 28;
  const paddingTop = 20;
  const paddingBottom = 35;

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

  const points =
    data.map((point, index) => {
      const x =
        data.length <= 1
          ? width / 2
          : paddingX +
            (index /
              (data.length - 1)) *
              chartWidth;

      const y =
        paddingTop +
        chartHeight -
        (point.value /
          maxValue) *
          chartHeight;

      return {
        ...point,
        x,
        y,
      };
    });

  const polyline =
    points
      .map(
        (point) =>
          `${point.x},${point.y}`
      )
      .join(" ");

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

      <div className="p-5">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label={title}
        >
          <line
            x1={paddingX}
            y1={
              paddingTop +
              chartHeight
            }
            x2={
              width - paddingX
            }
            y2={
              paddingTop +
              chartHeight
            }
            stroke="currentColor"
            className="text-black/10"
          />

          {polyline ? (
            <polyline
              points={polyline}
              fill="none"
              stroke="#7B2D3E"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {points.map((point) => (
  <circle
    key={point.date}
    cx={point.x}
    cy={point.y}
    r="4"
    fill="#7B2D3E"
  />
))}

          {points.length ? (
            <>
              <text
                x={paddingX}
                y={height - 8}
                fontSize="11"
                fill="currentColor"
                className="text-neutral-400"
              >
                {points[0].date}
              </text>

              <text
                x={
                  width -
                  paddingX
                }
                y={height - 8}
                textAnchor="end"
                fontSize="11"
                fill="currentColor"
                className="text-neutral-400"
              >
                {
                  points[
                    points.length - 1
                  ].date
                }
              </text>
            </>
          ) : null}
        </svg>
      </div>
    </div>
  );
}