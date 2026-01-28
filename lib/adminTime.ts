// lib/adminTime.ts

export function getUserLocale(): string {
  if (typeof navigator === "undefined") return "en-GB";
  return navigator.language || "en-GB";
}

export function getUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function safeDate(iso: string | Date): Date | null {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return isNaN(d.getTime()) ? null : d;
}

function prettyTimeZoneLabel(timeZone: string) {
  // "Europe/London" -> "London"
  const last = timeZone.split("/").pop() || timeZone;
  return last.replace(/_/g, " ");
}

export function formatDateTime(
  iso: string | Date,
  opts?: {
    locale?: string;
    timeZone?: string;
    dateStyle?: "full" | "long" | "medium" | "short";
    timeStyle?: "full" | "long" | "medium" | "short";
    showTimeZoneLabel?: boolean;
    timeZoneLabelStyle?: "iana" | "pretty"; // ✅ new
  }
) {
  const locale = opts?.locale ?? getUserLocale();
  const timeZone = opts?.timeZone ?? getUserTimeZone();

  const date = safeDate(iso);
  if (!date) return "";

  const str = new Intl.DateTimeFormat(locale, {
    dateStyle: opts?.dateStyle ?? "medium",
    timeStyle: opts?.timeStyle ?? "short",
    timeZone,
  }).format(date);

  if (!opts?.showTimeZoneLabel) return str;

  const label =
    opts?.timeZoneLabelStyle === "iana" ? timeZone : prettyTimeZoneLabel(timeZone);

  return `${str} (${label})`;
}

export function formatRelativeTime(iso: string | Date, locale?: string) {
  const loc = locale ?? getUserLocale();
  const rtf = new Intl.RelativeTimeFormat(loc, { numeric: "auto" });

  const date = safeDate(iso);
  if (!date) return "";

  const diffMs = date.getTime() - Date.now(); // past = negative
  const diffSec = Math.round(diffMs / 1000);

  const divisions: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];

  for (const [unit, secondsInUnit] of divisions) {
    if (Math.abs(diffSec) >= secondsInUnit || unit === "second") {
      const value = Math.round(diffSec / secondsInUnit);
      return rtf.format(value, unit);
    }
  }

  return "";
}
