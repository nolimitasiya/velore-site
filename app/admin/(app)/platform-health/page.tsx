import Link from "next/link";
import {
  PlatformHealthStatus,
  type PlatformHealthCheckType,
  type PlatformIncidentSeverity,
} from "@prisma/client";
import PlatformHealthHistory from "@/components/admin/platform-health/PlatformHealthHistory";
import { getPlatformHealthDashboard } from "@/lib/platform-health/admin/getPlatformHealthDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type MonitoringStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "STALE"
  | "UNKNOWN";

export default async function PlatformHealthPage() {
  const dashboard =
    await getPlatformHealthDashboard();

  const {
    overview,
    checks,
    incidents,
    generatedAt,
  } = dashboard;

  return (
    <main className="min-h-screen bg-neutral-50/70">
      <div className="space-y-6">
        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 shadow-sm md:px-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Admin operations
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Platform Health
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
                Monitor Veilora&apos;s storefront,
                database, analytics and critical
                platform services.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/admin/notifications"
                  className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-medium text-[#7B2D3E] shadow-sm transition hover:bg-white/90"
                >
                  View notifications
                </Link>

                <Link
                  href="/admin/catalogue-health"
                  className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
                >
                  Catalogue Health
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              <HeroMetric
                label="Platform"
                value={statusLabel(
                  overview.overallStatus
                )}
                highlighted
              />

              <HeroMetric
                label="Monitor"
                value={monitoringLabel(
                  overview.monitoringStatus
                )}
              />

              <HeroMetric
                label="Checks"
                value={overview.activeCheckCount}
              />

              <HeroMetric
                label="Down"
                value={overview.statusCounts.down}
              />

              <HeroMetric
                label="Open incidents"
                value={overview.openIncidentCount}
              />
            </div>
          </div>
        </section>

        <CurrentStateNotice
          platformStatus={overview.overallStatus}
          monitoringStatus={
            overview.monitoringStatus
          }
          monitoringReason={
            overview.monitoringReason
          }
          generatedAt={generatedAt}
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Healthy"
            value={overview.statusCounts.healthy}
            detail="Checks currently reporting healthy"
          />

          <SummaryCard
            label="Degraded"
            value={overview.statusCounts.degraded}
            detail="Checks operating with degradation"
          />

          <SummaryCard
            label="Down"
            value={overview.statusCounts.down}
            detail="Checks currently unavailable"
          />

          <SummaryCard
            label="Unknown"
            value={overview.statusCounts.unknown}
            detail="Checks without reliable current state"
          />
        </section>

        <SectionCard>
          <SectionHeader
            eyebrow="Current health"
            title="Monitored services"
            description={`${checks.length} active checks across Veilora's critical platform services.`}
          />

          <div className="divide-y divide-black/5">
            {checks.map((check) => (
              <CheckRow
                key={check.id}
                check={check}
              />
            ))}

            {checks.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-sm font-medium text-neutral-700">
                  No active platform checks.
                </div>

                <div className="mt-1 text-sm text-neutral-500">
                  Current platform health cannot be
                  determined.
                </div>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeader
            eyebrow="Incident management"
            title="Active incidents"
            description="Open and acknowledged platform incidents requiring visibility or investigation."
          />

          {incidents.open.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-sm font-medium text-emerald-800">
                No active incidents.
              </div>

              <div className="mt-1 text-sm text-neutral-500">
                Incident detection remains active while
                monitoring is running.
              </div>
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {incidents.open.map((incident) => (
                <IncidentRow
                  key={incident.id}
                  incident={incident}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard>
          <SectionHeader
            eyebrow="Monitor the monitor"
            title="Monitoring freshness"
            description="Platform status is only trustworthy while the monitoring system itself is running recently and successfully."
          />

          <div className="grid gap-5 px-5 py-5 md:grid-cols-2 md:px-6 xl:grid-cols-4">
            <DetailItem
              label="Monitor status"
              value={monitoringLabel(
                overview.monitoringStatus
              )}
            />

            <DetailItem
              label="Reason"
              value={humanize(
                overview.monitoringReason
              )}
            />

            <DetailItem
              label="Latest run"
              value={
                overview.monitoringLatestRun
                  ? formatDate(
                      overview
                        .monitoringLatestRun
                        .finishedAt ??
                        overview
                          .monitoringLatestRun
                          .startedAt
                    )
                  : "No runs recorded"
              }
            />

            <DetailItem
              label="Latest run result"
              value={
                overview.monitoringLatestRun
                  ?.status ?? "Unknown"
              }
            />
          </div>

          {overview.monitoringLatestRun ? (
            <div className="border-t border-black/5 px-5 py-4 text-xs text-neutral-500 md:px-6">
              Latest run selected{" "}
              {
                overview.monitoringLatestRun
                  .checksSelected
              }{" "}
              checks:{" "}
              {
                overview.monitoringLatestRun
                  .checksSucceeded
              }{" "}
              succeeded and{" "}
              {
                overview.monitoringLatestRun
                  .checksFailed
              }{" "}
              failed.
            </div>
          ) : null}
        </SectionCard>

        <PlatformHealthHistory
  performance={dashboard.performance}
  incidents={dashboard.incidents}
  capacity={dashboard.capacity}
/>

        <div className="px-1 pb-3 text-xs text-neutral-400">
          Dashboard generated{" "}
          {formatDate(generatedAt)}.
        </div>
      </div>
    </main>
  );
}

function HeroMetric({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: string | number;
  highlighted?: boolean;
}) {
  if (highlighted) {
    return (
      <div className="rounded-2xl border border-white/30 bg-white px-4 py-3">
        <div className="text-xs text-[#7B2D3E]/70">
          {label}
        </div>

        <div className="mt-1 text-xl font-semibold text-[#7B2D3E]">
          {value}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
      <div className="text-xs text-white/50">
        {label}
      </div>

      <div className="mt-1 text-xl font-semibold text-white">
        {value}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-400">
        {label}
      </div>

      <div className="mt-2 text-3xl font-semibold tracking-tight text-black">
        {value}
      </div>

      <div className="mt-2 text-sm leading-5 text-neutral-500">
        {detail}
      </div>
    </div>
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

function CurrentStateNotice({
  platformStatus,
  monitoringStatus,
  monitoringReason,
  generatedAt,
}: {
  platformStatus: PlatformHealthStatus;
  monitoringStatus: MonitoringStatus;
  monitoringReason: string;
  generatedAt: Date;
}) {
  if (
    monitoringStatus === "STALE" ||
    monitoringStatus === "UNKNOWN"
  ) {
    return (
      <div className="rounded-3xl border border-neutral-200 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <StatusBadge status="UNKNOWN" />

            <div className="mt-3 text-lg font-semibold text-black">
              Current platform health cannot be
              confirmed.
            </div>

            <div className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">
              The latest monitoring data is not fresh
              enough to describe Veilora&apos;s current
              state. The last recorded check results
              remain visible below for diagnostic
              context.
            </div>
          </div>

          <div className="shrink-0 text-left text-xs text-neutral-400 md:text-right">
            <div>
              {humanize(monitoringReason)}
            </div>

            <div className="mt-1">
              Viewed {formatDate(generatedAt)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-black/10 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <StatusBadge status={platformStatus} />

          <div className="mt-3 text-lg font-semibold text-black">
            {platformStatus ===
            PlatformHealthStatus.HEALTHY
              ? "Platform checks are healthy."
              : platformStatus ===
                  PlatformHealthStatus.DEGRADED
                ? "Platform degradation detected."
                : platformStatus ===
                    PlatformHealthStatus.DOWN
                  ? "Platform outage detected."
                  : "Platform state is unknown."}
          </div>

          <div className="mt-1 text-sm leading-6 text-neutral-500">
            Status is derived from active health checks
            and monitoring freshness.
          </div>
        </div>

        <div className="shrink-0 text-xs text-neutral-400">
          Viewed {formatDate(generatedAt)}
        </div>
      </div>
    </div>
  );
}

function CheckRow({
  check,
}: {
  check: {
    id: string;
    checkKey: string;
    name: string;
    description: string | null;
    checkType: PlatformHealthCheckType;
    path: string | null;
    httpMethod: string | null;
    status: PlatformHealthStatus;
    consecutiveFailures: number;
    consecutiveSuccesses: number;
    lastCheckedAt: Date | null;
    lastHealthyAt: Date | null;
    lastFailedAt: Date | null;
    lastHttpStatus: number | null;
    lastResponseTimeMs: number | null;
    lastFailureReason: string | null;
  };
}) {
  return (
    <div className="grid gap-5 px-5 py-5 md:px-6 xl:grid-cols-[minmax(0,1.5fr)_150px_180px_180px_220px] xl:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={check.status} />

          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
            {check.checkType}
          </span>
        </div>

        <div className="mt-3 font-medium text-black">
          {check.name}
        </div>

        {check.description ? (
          <div className="mt-1 max-w-xl text-sm leading-5 text-neutral-500">
            {check.description}
          </div>
        ) : null}
      </div>

      <DetailItem
        label="Response"
        value={
          check.lastResponseTimeMs !== null
            ? `${check.lastResponseTimeMs} ms`
            : "—"
        }
      />

      <DetailItem
        label="HTTP"
        value={
          check.lastHttpStatus !== null
            ? String(check.lastHttpStatus)
            : check.checkType === "HTTP"
              ? "—"
              : "N/A"
        }
      />

      <DetailItem
        label="Last checked"
        value={formatDate(check.lastCheckedAt)}
      />

      <div>
        <div className="text-xs uppercase tracking-[0.12em] text-neutral-400">
          Latest signal
        </div>

        <div className="mt-1 text-sm font-medium text-black">
          {check.lastFailureReason
            ? humanize(check.lastFailureReason)
            : check.lastHealthyAt
              ? `Healthy ${formatDate(
                  check.lastHealthyAt
                )}`
              : "No successful check yet"}
        </div>

        {check.consecutiveFailures > 0 ? (
          <div className="mt-1 text-xs text-red-600">
            {check.consecutiveFailures} consecutive{" "}
            {check.consecutiveFailures === 1
              ? "failure"
              : "failures"}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function IncidentRow({
  incident,
}: {
  incident: {
    id: string;
    type: string;
    status: string;
    severity: PlatformIncidentSeverity;
    title: string;
    description: string | null;
    openedAt: Date;
    lastSeenAt: Date;
    occurrenceCount: number;

    affectedChecks: Array<{
      check: {
        id: string;
        checkKey: string;
        name: string;
        status: PlatformHealthStatus;
      } | null;
    }>;

    routes: Array<{
      id: string;
      routeKey: string;
      method: string | null;
      path: string | null;
      occurrenceCount: number;
    }>;
  };
}) {
  return (
    <div className="grid gap-5 px-5 py-5 md:px-6 xl:grid-cols-[minmax(0,1.5fr)_160px_160px_220px] xl:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge
            severity={incident.severity}
          />

          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
            {humanize(incident.status)}
          </span>
        </div>

        <div className="mt-3 font-medium text-black">
          {incident.title}
        </div>

        <div className="mt-1 text-sm text-neutral-500">
          {humanize(incident.type)}
        </div>

        {incident.description ? (
          <div className="mt-2 max-w-2xl text-sm leading-5 text-neutral-500">
            {incident.description}
          </div>
        ) : null}
      </div>

      <DetailItem
        label="Occurrences"
        value={String(incident.occurrenceCount)}
      />

      <DetailItem
        label="Affected checks"
        value={String(
          incident.affectedChecks.length
        )}
      />

      <div>
        <div className="text-xs uppercase tracking-[0.12em] text-neutral-400">
          Last seen
        </div>

        <div className="mt-1 text-sm font-medium text-black">
          {formatDate(incident.lastSeenAt)}
        </div>

        <div className="mt-1 text-xs text-neutral-500">
          Opened {formatDate(incident.openedAt)}
        </div>
      </div>
    </div>
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

function StatusBadge({
  status,
}: {
  status: PlatformHealthStatus;
}) {
  const classes =
    status === PlatformHealthStatus.HEALTHY
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status ===
          PlatformHealthStatus.DEGRADED
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : status === PlatformHealthStatus.DOWN
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-black/10 bg-neutral-100 text-neutral-600";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium ${classes}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function SeverityBadge({
  severity,
}: {
  severity: PlatformIncidentSeverity;
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

function statusLabel(
  status: PlatformHealthStatus
) {
  switch (status) {
    case PlatformHealthStatus.HEALTHY:
      return "Healthy";

    case PlatformHealthStatus.DEGRADED:
      return "Degraded";

    case PlatformHealthStatus.DOWN:
      return "Down";

    default:
      return "Unknown";
  }
}

function monitoringLabel(
  status: MonitoringStatus
) {
  switch (status) {
    case "HEALTHY":
      return "Healthy";

    case "DEGRADED":
      return "Degraded";

    case "STALE":
      return "Stale";

    default:
      return "Unknown";
  }
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