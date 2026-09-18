import { claimDueCatalogueHealthTargets } from "@/lib/catalogue-health/claimTargets";
import { processCatalogueHealthTarget } from "@/lib/catalogue-health/processTarget";
import { syncCatalogueHealthTargets } from "@/lib/catalogue-health/syncTargets";

const DEFAULT_BATCH_SIZE = 40;
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_PER_DOMAIN_CONCURRENCY = 2;

const MAX_BATCH_SIZE = 100;
const MAX_CONCURRENCY = 10;
const MAX_PER_DOMAIN_CONCURRENCY = 3;

type RunOptions = {
  batchSize?: number;
  concurrency?: number;
  perDomainConcurrency?: number;
  syncTargets?: boolean;
};

export async function runCatalogueHealthBatch(
  options: RunOptions = {}
) {
  const startedAt = new Date();
  const runStartedMs = Date.now();

  const batchSize = clamp(
    options.batchSize ?? DEFAULT_BATCH_SIZE,
    1,
    MAX_BATCH_SIZE
  );

  const concurrency = clamp(
    options.concurrency ?? DEFAULT_CONCURRENCY,
    1,
    MAX_CONCURRENCY
  );

  const perDomainConcurrency = clamp(
    options.perDomainConcurrency ??
      DEFAULT_PER_DOMAIN_CONCURRENCY,
    1,
    MAX_PER_DOMAIN_CONCURRENCY
  );

  /*
   * Phase 1: synchronise the catalogue with the health-target registry.
   */
  const syncStartedMs = Date.now();

  const syncResult =
    options.syncTargets === false
      ? null
      : await syncCatalogueHealthTargets();

  const syncDurationMs =
    Date.now() - syncStartedMs;

  /*
   * Phase 2: claim a bounded set of due targets.
   */
  const claimStartedMs = Date.now();

  const claim =
    await claimDueCatalogueHealthTargets(
      batchSize
    );

  const claimDurationMs =
    Date.now() - claimStartedMs;

  if (!claim.acquired) {
    const finishedAt = new Date();

    return {
      startedAt,
      finishedAt,
      durationMs:
        Date.now() - runStartedMs,

      batchSize,
      concurrency,
      perDomainConcurrency,

      sync: syncResult,

      timings: {
        syncMs: syncDurationMs,
        claimMs: claimDurationMs,
        checksMs: 0,
      },

      lockAcquired: false,

      dueTargetsSelected: 0,
      succeeded: 0,
      failed: 0,

      results: [],
    };
  }

  const targets = claim.value;

  /*
   * Phase 3: perform external checks.
   *
   * Global concurrency protects Veilora.
   * Per-domain concurrency protects each external brand/CDN.
   */
  const checksStartedMs = Date.now();

  const domainLimiter =
    createDomainConcurrencyLimiter(
      perDomainConcurrency
    );

  const results = await mapWithConcurrency(
    targets,
    concurrency,
    async (target) => {
      const targetStartedMs = Date.now();

      const domain = getTargetDomain(
        target.url
      );

      try {
        const result =
          await domainLimiter.run(
            domain,
            () =>
              processCatalogueHealthTarget(
                target.id
              )
          );

        return {
          targetKey: target.targetKey,
          targetType: target.targetType,
          domain,

          ok: true as const,

          durationMs:
            Date.now() - targetStartedMs,

          result,
        };
      } catch (error) {
        console.error(
          "[catalogue-health] Target processing failed",
          {
            targetId: target.id,
            targetKey: target.targetKey,
            domain,
            error,
          }
        );

        return {
          targetKey: target.targetKey,
          targetType: target.targetType,
          domain,

          ok: false as const,

          durationMs:
            Date.now() - targetStartedMs,

          error:
            error instanceof Error
              ? error.message
              : "Unknown processing error",
        };
      }
    }
  );

  const checksDurationMs =
    Date.now() - checksStartedMs;

  const succeeded = results.filter(
    (result) => result.ok
  ).length;

  const failed =
    results.length - succeeded;

  const finishedAt = new Date();

  return {
    startedAt,
    finishedAt,
    durationMs:
      Date.now() - runStartedMs,

    batchSize,
    concurrency,
    perDomainConcurrency,

    sync: syncResult,

    timings: {
      syncMs: syncDurationMs,
      claimMs: claimDurationMs,
      checksMs: checksDurationMs,
    },

    lockAcquired: true,

    dueTargetsSelected:
      targets.length,
    succeeded,
    failed,

    results,
  };
}

function getTargetDomain(
  url: string
): string {
  try {
    return new URL(url)
      .hostname
      .toLowerCase();
  } catch {
    /*
     * Invalid URLs still need to reach the checker so they can be
     * classified as INVALID_URL. Group them under a shared bucket.
     */
    return "__invalid_url__";
  }
}

function createDomainConcurrencyLimiter(
  maximumPerDomain: number
) {
  const states = new Map<
    string,
    {
      active: number;
      waiting: Array<() => void>;
    }
  >();

  async function acquire(
    domain: string
  ) {
    let state = states.get(domain);

    if (!state) {
      state = {
        active: 0,
        waiting: [],
      };

      states.set(domain, state);
    }

    if (
      state.active <
      maximumPerDomain
    ) {
      state.active++;
      return;
    }

    await new Promise<void>(
      (resolve) => {
        state!.waiting.push(resolve);
      }
    );

    state.active++;
  }

  function release(
    domain: string
  ) {
    const state =
      states.get(domain);

    if (!state) {
      return;
    }

    state.active--;

    const next =
      state.waiting.shift();

    if (next) {
      next();
      return;
    }

    if (state.active === 0) {
      states.delete(domain);
    }
  }

  return {
    async run<T>(
      domain: string,
      work: () => Promise<T>
    ): Promise<T> {
      await acquire(domain);

      try {
        return await work();
      } finally {
        release(domain);
      }
    },
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results =
    new Array<R>(items.length);

  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const index = nextIndex++;

      if (index >= items.length) {
        return;
      }

      results[index] =
        await worker(items[index]);
    }
  }

  const workerCount = Math.min(
    concurrency,
    items.length
  );

  await Promise.all(
    Array.from(
      { length: workerCount },
      () => runWorker()
    )
  );

  return results;
}

function clamp(
  value: number,
  minimum: number,
  maximum: number
) {
  return Math.min(
    Math.max(
      Math.floor(value),
      minimum
    ),
    maximum
  );
}