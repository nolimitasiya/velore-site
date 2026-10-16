import "server-only";

import { recordAuditSuppressionIncident } from "./recordAuditSuppressionIncident";
import type { AuditCategory } from "./auditIngestion";

const CACHE_TTL_MS = 5 * 60_000;
const MAX_CACHE_ENTRIES = 1_000;

type CacheEntry = {
  expiresAt: number;
};

const completed = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<void>>();

function getWindowKey(
  category: AuditCategory,
  auditResetAt: Date,
): string {
  if (Number.isNaN(auditResetAt.getTime())) {
    throw new Error("Invalid audit suppression window");
  }

  return `${category}:${auditResetAt.toISOString()}`;
}

function pruneCache(now: number): void {
  for (const [key, entry] of completed) {
    if (entry.expiresAt <= now) {
      completed.delete(key);
    }
  }

  while (completed.size > MAX_CACHE_ENTRIES) {
    const oldestKey = completed.keys().next().value;

    if (oldestKey === undefined) {
      break;
    }

    completed.delete(oldestKey);
  }
}

/**
 * Best-effort suppression reporting.
 *
 * Local cache:
 * - avoids repeated database writes on this server instance;
 * - allows retry after failure.
 *
 * Database:
 * - guarantees deduplication across server instances.
 *
 * This must never control authentication.
 */
export async function reportAuditSuppression(
  category: AuditCategory,
  auditResetAt: Date,
): Promise<void> {
  const key = getWindowKey(category, auditResetAt);
  const now = Date.now();

  pruneCache(now);

  const existing = completed.get(key);

  if (existing && existing.expiresAt > now) {
    return;
  }

  const pending = inFlight.get(key);

  if (pending) {
    return pending;
  }

  const operation = (async () => {
    await recordAuditSuppressionIncident({
      category,
      auditResetAt,
    });

    completed.set(key, {
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    pruneCache(Date.now());
  })();

  inFlight.set(key, operation);

  try {
    await operation;
  } finally {
    if (inFlight.get(key) === operation) {
      inFlight.delete(key);
    }
  }
}