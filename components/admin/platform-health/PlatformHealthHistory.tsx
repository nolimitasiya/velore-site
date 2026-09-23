import type {
  PlatformHealthDashboard,
} from "@/lib/platform-health/admin/getPlatformHealthDashboard";

type Props = {
  performance: PlatformHealthDashboard["performance"];
  incidents: PlatformHealthDashboard["incidents"];
  capacity: PlatformHealthDashboard["capacity"];
};

export default function PlatformHealthHistory({
  performance,
  incidents,
  capacity,
}: Props) {
  const hourly = performance.hourly.aggregates;
  const daily = performance.daily.aggregates;

  const hourlyByCheck = groupByCheck(hourly);
  const dailyByCheck = groupByCheck(daily);

  return (
    <div className="space-y-6">
      <SectionCard>
        <SectionHeader
          eyebrow="Performance"
          title="Operational history"
          description="Recent availability and response-time evidence from Platform Health checks."
        />

        <div className="border-b border-black/5 px-5 py-5 md:px-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <HistoryMetric
              label="Hourly history"
              value={`${hourly.length} buckets`}
              detail="Last 72 hours"
            />

            <HistoryMetric
              label="Daily history"
              value={`${daily.length} buckets`}
              detail="Last 90 days"
            />

            <HistoryMetric
              label="Hourly checks"
              value={hourlyByCheck.length}
              detail="Checks with hourly evidence"
            />

            <HistoryMetric
              label="Daily checks"
              value={dailyByCheck.length}
              detail="Checks with daily evidence"
            />
          </div>
        </div>

        <div className="px-5 py-5 md:px-6">
          <div className="mb-4">
            <div className="text-sm font-semibold text-black">
              Recent hourly evidence
            </div>

            <div className="mt-1 text-sm text-neutral-500">
              Latest recorded hourly aggregate for each
              monitored check.
            </div>
          </div>

          {hourlyByCheck.length === 0 ? (
            <EmptyState>
              No hourly performance history is available
              yet.
            </EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-black/10">
              <table className="min-w-[900px] w-full text-left">
                <thead className="bg-neutral-50">
                  <tr className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                    <th className="px-4 py-3 font-medium">
                      Check
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Hour
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Availability
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Avg
                    </th>
                    <th className="px-4 py-3 font-medium">
                      P50
                    </th>
                    <th className="px-4 py-3 font-medium">
                      P95
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Max
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Unknown
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/5">
                  {hourlyByCheck.map((item) => {
                    const latest =
                      item.aggregates[
                        item.aggregates.length - 1
                      ];

                    return (
                      <tr
                        key={item.checkKey}
                        className="text-sm"
                      >
                        <td className="px-4 py-4">
                          <div className="font-medium text-black">
                            {item.checkName}
                          </div>

                          <div className="mt-1 text-xs text-neutral-400">
                            {item.checkType}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-neutral-600">
                          {formatDate(
                            latest.bucketStart
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <AvailabilityValue
                            value={
                              latest.availabilityPercent
                            }
                          />
                        </td>

                        <td className="px-4 py-4 text-neutral-600">
                          {formatMs(
                            latest.responseTimeAvgMs
                          )}
                        </td>

                        <td className="px-4 py-4 text-neutral-600">
                          {formatMs(
                            latest.responseTimeP50Ms
                          )}
                        </td>

                        <td className="px-4 py-4 text-neutral-600">
                          {formatMs(
                            latest.responseTimeP95Ms
                          )}
                        </td>

                        <td className="px-4 py-4 text-neutral-600">
                          {formatMs(
                            latest.responseTimeMaxMs
                          )}
                        </td>

                        <td className="px-4 py-4 text-neutral-600">
                          {latest.unknownCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-black/5 px-5 py-5 md:px-6">
          <div className="mb-4">
            <div className="text-sm font-semibold text-black">
              Daily history
            </div>

            <div className="mt-1 text-sm text-neutral-500">
              Latest daily aggregate for each check.
              Daily percentiles are intentionally not
              calculated.
            </div>
          </div>

          {dailyByCheck.length === 0 ? (
            <EmptyState>
              No daily performance history is available
              yet.
            </EmptyState>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-black/10">
              <table className="min-w-[760px] w-full text-left">
                <thead className="bg-neutral-50">
                  <tr className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                    <th className="px-4 py-3 font-medium">
                      Check
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Day
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Availability
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Avg
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Max
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Unknown
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/5">
                  {dailyByCheck.map((item) => {
                    const latest =
                      item.aggregates[
                        item.aggregates.length - 1
                      ];

                    return (
                      <tr
                        key={item.checkKey}
                        className="text-sm"
                      >
                        <td className="px-4 py-4">
                          <div className="font-medium text-black">
                            {item.checkName}
                          </div>

                          <div className="mt-1 text-xs text-neutral-400">
                            {item.checkType}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-neutral-600">
                          {formatDay(
                            latest.bucketStart
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <AvailabilityValue
                            value={
                              latest.availabilityPercent
                            }
                          />
                        </td>

                        <td className="px-4 py-4 text-neutral-600">
                          {formatMs(
                            latest.responseTimeAvgMs
                          )}
                        </td>

                        <td className="px-4 py-4 text-neutral-600">
                          {formatMs(
                            latest.responseTimeMaxMs
                          )}
                        </td>

                        <td className="px-4 py-4 text-neutral-600">
                          {latest.unknownCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-black/5 bg-neutral-50/60 px-5 py-4 text-xs leading-5 text-neutral-500 md:px-6">
          <span className="font-medium text-neutral-700">
            Methodology:
          </span>{" "}
          {performance.methodology.availability}{" "}
          {performance.methodology.unknown}{" "}
          {performance.methodology.dailyLatency}
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          eyebrow="Incident history"
          title="Recently resolved"
          description="Recent incidents retained after recovery for operational review."
        />

        {incidents.recentlyResolved.length === 0 ? (
          <div className="px-5 py-10 md:px-6">
            <EmptyState>
              No resolved platform incidents are
              currently recorded.
            </EmptyState>
          </div>
        ) : (
          <div className="divide-y divide-black/5">
            {incidents.recentlyResolved.map(
              (incident) => (
                <div
                  key={incident.id}
                  className="grid gap-5 px-5 py-5 md:px-6 xl:grid-cols-[minmax(0,1.5fr)_150px_160px_210px]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge
                        severity={incident.severity}
                      />

                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-800">
                        Resolved
                      </span>
                    </div>

                    <div className="mt-3 font-medium text-black">
                      {incident.title}
                    </div>

                    <div className="mt-1 text-sm text-neutral-500">
                      {humanize(incident.type)}
                    </div>

                    {incident.resolutionNote ? (
                      <div className="mt-2 max-w-2xl text-sm leading-5 text-neutral-500">
                        {incident.resolutionNote}
                      </div>
                    ) : null}
                  </div>

                  <DetailItem
                    label="Occurrences"
                    value={String(
                      incident.occurrenceCount
                    )}
                  />

                  <DetailItem
                    label="Affected checks"
                    value={String(
                      incident.affectedChecks.length
                    )}
                  />

                  <div>
                    <DetailItem
                      label="Resolved"
                      value={formatDate(
                        incident.resolvedAt
                      )}
                    />

                    <div className="mt-2 text-xs text-neutral-400">
                      Last seen{" "}
                      {formatDate(
                        incident.lastSeenAt
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <SectionHeader
          eyebrow="Capacity evidence"
          title="Production load-test baseline"
          description="Controlled synthetic HTTP capacity evidence from the production environment."
        />

        <div className="grid gap-5 px-5 py-5 md:grid-cols-2 md:px-6">
          <CapacityCard
            label="Verified clean run"
            tone="success"
            headline={`${capacity.verifiedClean.virtualUsers} VU`}
            rows={[
              [
                "Duration",
                `${capacity.verifiedClean.durationSeconds}s`,
              ],
              [
                "HTTP requests",
                formatNumber(
                  capacity.verifiedClean.requests
                ),
              ],
              [
                "Failed requests",
                formatNumber(
                  capacity.verifiedClean
                    .failedRequests
                ),
              ],
              [
                "HTTP P95",
                formatMs(
                  capacity.verifiedClean.httpP95Ms
                ),
              ],
              [
                "Throughput",
                `${capacity.verifiedClean.requestsPerSecond.toFixed(
                  2
                )} req/s`,
              ],
              [
                "Journeys",
                formatNumber(
                  capacity.verifiedClean.journeys
                ),
              ],
              [
                "Failed journeys",
                formatNumber(
                  capacity.verifiedClean
                    .failedJourneys
                ),
              ],
              [
                "Journey P95",
                formatMs(
                  capacity.verifiedClean
                    .journeyP95Ms
                ),
              ],
            ]}
          />

          <CapacityCard
            label="Verified failure run"
            tone="danger"
            headline={`${capacity.verifiedFailure.virtualUsers} VU`}
            rows={[
              [
                "Duration",
                `${capacity.verifiedFailure.durationSeconds}s`,
              ],
              [
                "HTTP requests",
                formatNumber(
                  capacity.verifiedFailure.requests
                ),
              ],
              [
                "Failed requests",
                `${capacity.verifiedFailure.failedRequestPercent.toFixed(
                  2
                )}%`,
              ],
              [
                "Failed journeys",
                `${capacity.verifiedFailure.failedJourneyPercent.toFixed(
                  2
                )}%`,
              ],
              [
                "Failure",
                humanize(
                  capacity.verifiedFailure
                    .failureType
                ),
              ],
            ]}
          />
        </div>

        <div className="border-t border-black/5 px-5 py-5 md:px-6">
          <div className="grid gap-5 lg:grid-cols-3">
            <DetailItem
              label="Test type"
              value="Synthetic HTTP workload"
            />

            <DetailItem
              label="Environment"
              value={capacity.environment}
            />

            <DetailItem
              label="DB connection limit"
              value={String(
                capacity.databaseConnectionLimit
              )}
            />
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
            <span className="font-semibold">
              Interpretation:
            </span>{" "}
            {
              capacity.interpretation
                .cleanBoundary
            }{" "}
            {
              capacity.interpretation
                .failureBoundary
            }
          </div>

          <div className="mt-3 text-xs leading-5 text-neutral-500">
            {
              capacity.interpretation
                .limitation
            }
          </div>

          <div className="mt-2 text-xs text-neutral-400">
            Tested {formatDay(capacity.testedAt)}.
            This is historical evidence, not a live
            capacity measurement.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function groupByCheck<
  T extends {
    checkKey: string;
    checkName: string;
    checkType: string;
    bucketStart: Date;
  },
>(aggregates: T[]) {
  const groups = new Map<
    string,
    {
      checkKey: string;
      checkName: string;
      checkType: string;
      aggregates: T[];
    }
  >();

  for (const aggregate of aggregates) {
    const existing = groups.get(
      aggregate.checkKey
    );

    if (existing) {
      existing.aggregates.push(aggregate);
      continue;
    }

    groups.set(aggregate.checkKey, {
      checkKey: aggregate.checkKey,
      checkName: aggregate.checkName,
      checkType: aggregate.checkType,
      aggregates: [aggregate],
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      aggregates: [...group.aggregates].sort(
        (a, b) =>
          a.bucketStart.getTime() -
          b.bucketStart.getTime()
      ),
    }))
    .sort((a, b) =>
      a.checkName.localeCompare(b.checkName)
    );
}

function SectionCard({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {children}
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-black/10 px-5 py-5 md:px-6">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89280]">
        {eyebrow}
      </div>

      <div className="mt-1 text-lg font-semibold text-black">
        {title}
      </div>

      <div className="mt-1 text-sm leading-6 text-neutral-500">
        {description}
      </div>
    </div>
  );
}

function HistoryMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-neutral-50/60 px-4 py-4">
      <div className="text-xs uppercase tracking-[0.12em] text-neutral-400">
        {label}
      </div>

      <div className="mt-2 text-xl font-semibold text-black">
        {value}
      </div>

      <div className="mt-1 text-xs text-neutral-500">
        {detail}
      </div>
    </div>
  );
}

function CapacityCard({
  label,
  headline,
  rows,
  tone,
}: {
  label: string;
  headline: string;
  rows: Array<[string, string]>;
  tone: "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50/50"
      : "border-red-200 bg-red-50/40";

  return (
    <div
      className={`rounded-3xl border p-5 ${toneClass}`}
    >
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </div>

      <div className="mt-2 text-3xl font-semibold tracking-tight text-black">
        {headline}
      </div>

      <div className="mt-5 divide-y divide-black/5">
        {rows.map(([rowLabel, value]) => (
          <div
            key={rowLabel}
            className="flex items-start justify-between gap-4 py-2.5 text-sm"
          >
            <span className="text-neutral-500">
              {rowLabel}
            </span>

            <span className="text-right font-medium text-black">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AvailabilityValue({
  value,
}: {
  value: number | null;
}) {
  if (value === null) {
    return (
      <span className="text-neutral-400">
        —
      </span>
    );
  }

  return (
    <span
      className={
        value >= 99
          ? "font-medium text-emerald-700"
          : value >= 95
            ? "font-medium text-amber-700"
            : "font-medium text-red-700"
      }
    >
      {formatPercent(value)}
    </span>
  );
}

function SeverityBadge({
  severity,
}: {
  severity: string;
}) {
  const classes =
    severity === "CRITICAL"
      ? "border-red-300 bg-red-50 text-red-800"
      : severity === "HIGH"
        ? "border-orange-200 bg-orange-50 text-orange-800"
        : severity === "WARNING"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-black/10 bg-neutral-100 text-neutral-600";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium ${classes}`}
    >
      {humanize(severity)}
    </span>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.12em] text-neutral-400">
        {label}
      </div>

      <div className="mt-1 text-sm font-medium text-black">
        {value}
      </div>
    </div>
  );
}

function EmptyState({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-black/10 bg-neutral-50/50 px-5 py-7 text-center text-sm text-neutral-500">
      {children}
    </div>
  );
}

function formatMs(value: number | null) {
  if (value === null) {
    return "—";
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} s`;
  }

  return `${value} ms`;
}

function formatPercent(value: number) {
  const rounded =
    Math.round(value * 100) / 100;

  return `${rounded.toLocaleString(
    "en-GB",
    {
      maximumFractionDigits: 2,
    }
  )}%`;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-GB");
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function formatDate(
  value: Date | string | null
) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

function formatDay(
  value: Date | string
) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/London",
  }).format(new Date(value));
}