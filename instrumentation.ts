import type {
  Instrumentation,
} from "next";

import {
  classifyRuntimeError,
  normalizeRuntimeError,
} from "@/lib/platform-health/runtime/classifyRuntimeError";

import {
  observeRuntimeError,
} from "@/lib/platform-health/runtime/runtimeAccumulator";

import {
  persistRuntimeIncidentBatch,
} from "@/lib/platform-health/runtime/persistRuntimeBatch";

export const onRequestError:
  Instrumentation.onRequestError =
  async (
    error,
    request,
    context
  ) => {
    const normalizedError =
      normalizeRuntimeError(error);

    const incidentType =
      classifyRuntimeError(
        normalizedError
      );

    /*
     * Always emit the structured platform log.
     *
     * Vercel remains our independent observer
     * if Veilora's own database or monitoring
     * persistence is unavailable.
     */
    console.error(
      "[PLATFORM INCIDENT]",
      {
        type:
          incidentType,

        errorName:
          normalizedError.name,

        digest:
          normalizedError.digest ??
          null,

        request: {
          method:
            request.method,

          path:
            request.path,
        },

        context: {
          routerKind:
            context.routerKind,

          routePath:
            context.routePath,

          routeType:
            context.routeType,
        },
      }
    );

    /*
     * Runtime incident persistence is
     * deliberately best-effort.
     *
     * observeRuntimeError() aggregates errors
     * in memory and only returns a batch when
     * the local throttle window is ready.
     *
     * We must never allow Platform Health
     * persistence to interfere with Next.js
     * error handling.
     */
    try {
      const batch =
        observeRuntimeError({
          type:
            incidentType,

          errorName:
            normalizedError.name,

          digest:
            normalizedError.digest ??
            null,

          method:
            request.method,

          path:
            request.path,

          routerKind:
            context.routerKind,

          routePath:
            context.routePath,

          routeType:
            context.routeType,

          occurredAt:
            new Date(),
        });

      if (batch) {
        try {
          await persistRuntimeIncidentBatch(
            batch
          );
        } catch (
          persistenceError
        ) {
          /*
           * Do not print the original database
           * error message or stack here.
           *
           * During incidents such as EMAXCONN,
           * the persistence attempt itself may
           * fail. That must not cause recursive
           * monitoring behaviour or expose
           * unnecessary error details.
           */
          console.error(
            "[PLATFORM HEALTH INGEST FAILED]",
            {
              type:
                incidentType,

              errorName:
                persistenceError instanceof
                Error
                  ? persistenceError.name
                  : "UnknownError",
            }
          );
        }
      }
    } catch (monitoringError) {
      /*
       * Defensive outer boundary.
       *
       * A bug in Platform Health itself must
       * never replace or interfere with the
       * application's original runtime error.
       */
      console.error(
        "[PLATFORM HEALTH OBSERVER FAILED]",
        {
          type:
            incidentType,

          errorName:
            monitoringError instanceof
            Error
              ? monitoringError.name
              : "UnknownError",
        }
      );
    }
  };