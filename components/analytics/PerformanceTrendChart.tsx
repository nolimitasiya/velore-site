type TrendPoint = {
  date: string;
  impressions: number;
  views: number;
  wishlistAdds: number;
  shopClicks: number;
};

function formatTrendDate(
  value: string,
  includeDay = false
) {
  const date = new Date(
    `${value}T00:00:00Z`
  );

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(includeDay
      ? { weekday: "short" as const }
      : {}),
    timeZone: "UTC",
  }).format(date);
}

export default function PerformanceTrendChart({
  data,
  ariaLabel = "Performance over time",
  emptyMessage = "Performance will appear here as shoppers interact with products.",
}: {
  data: TrendPoint[];
  ariaLabel?: string;
  emptyMessage?: string;
}) {
  const width = 1000;
  const height = 300;

  const padding = {
    top: 20,
    right: 20,
    bottom: 48,
    left: 48,
  };

  const chartWidth =
    width - padding.left - padding.right;

  const chartHeight =
    height - padding.top - padding.bottom;

  const series = [
    {
      key: "impressions" as const,
      label: "Impressions",
      color: "#C8A99A",
    },
    {
      key: "views" as const,
      label: "Product views",
      color: "#7B2D3E",
    },
    {
      key: "wishlistAdds" as const,
      label: "Wishlist adds",
      color: "#A96B78",
    },
    {
      key: "shopClicks" as const,
      label: "Shop clicks",
      color: "#4F6B5A",
    },
  ];

  const maxValue = Math.max(
    1,
    ...data.flatMap((point) =>
      series.map((item) => point[item.key])
    )
  );

  const roundedMax =
    maxValue <= 10
      ? 10
      : Math.ceil(maxValue / 10) * 10;

  const x = (index: number) => {
    if (data.length <= 1) {
      return padding.left + chartWidth / 2;
    }

    return (
      padding.left +
      (index / (data.length - 1)) *
        chartWidth
    );
  };

  const y = (value: number) =>
    padding.top +
    chartHeight -
    (value / roundedMax) * chartHeight;

  const gridValues = [
    0,
    roundedMax * 0.25,
    roundedMax * 0.5,
    roundedMax * 0.75,
    roundedMax,
  ];

  const labelEvery =
    data.length <= 7
      ? 1
      : data.length <= 14
        ? 2
        : Math.ceil(data.length / 7);

  const hasActivity = data.some((point) =>
    series.some((item) => point[item.key] > 0)
  );

  if (!hasActivity) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-2xl bg-[#fdf7f4] px-6 text-center">
        <div>
          <div className="text-sm font-medium text-neutral-700">
            No activity in this period
          </div>

          <p className="mt-1 text-xs text-neutral-400">
            {emptyMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={ariaLabel}
          className="min-w-[700px] w-full"
        >
          {gridValues.map((value) => {
            const gridY = y(value);

            return (
              <g key={value}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={gridY}
                  y2={gridY}
                  stroke="#000000"
                  strokeOpacity="0.06"
                  strokeWidth="1"
                />

                <text
                  x={padding.left - 12}
                  y={gridY + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#A3A3A3"
                >
                  {Math.round(value)}
                </text>
              </g>
            );
          })}

          {data.map((point, index) => {
            const show =
              index % labelEvery === 0 ||
              index === data.length - 1;

            if (!show) return null;

            return (
              <text
                key={point.date}
                x={x(index)}
                y={height - 12}
                textAnchor="middle"
                fontSize="11"
                fill="#A3A3A3"
              >
                {formatTrendDate(
                  point.date,
                  data.length <= 7
                )}
              </text>
            );
          })}

          {series.map((item) => {
            const points = data
              .map(
                (point, index) =>
                  `${x(index)},${y(
                    point[item.key]
                  )}`
              )
              .join(" ");

            return (
              <g key={item.key}>
                {data.length > 1 && (
                  <polyline
                    points={points}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={
                      item.key === "views"
                        ? 3
                        : 2
                    }
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {data.map((point, index) => (
                  <circle
                    key={`${item.key}-${point.date}`}
                    cx={x(index)}
                    cy={y(point[item.key])}
                    r={
                      item.key === "views"
                        ? 4
                        : 3
                    }
                    fill={item.color}
                    stroke="white"
                    strokeWidth="1.5"
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-2">
        {series.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-2 text-xs text-neutral-500"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: item.color,
              }}
            />

            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}