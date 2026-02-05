import "server-only";

export function toMonthStartUTC(input: Date | string) {
  const d = typeof input === "string" ? new Date(input) : input;
  // Normalize to first day of month 00:00 UTC
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

// convenience: current month start
export function currentMonthStartUTC() {
  return toMonthStartUTC(new Date());
}
