import type { Instrumentation } from "next";

type PlatformIncidentType =
  | "DATABASE_CONNECTION_EXHAUSTED"
  | "DATABASE_ERROR"
  | "SERVER_ERROR";

type NormalizedError = {
  name: string;
  message: string;
  stack?: string;
  digest?: string;
};

function normalizeError(error: unknown): NormalizedError {
  if (error instanceof Error) {
    const errorWithDigest = error as Error & {
      digest?: unknown;
    };

    return {
      name: error.name || "Error",
      message: error.message || "",
      stack: error.stack,
      digest:
        typeof errorWithDigest.digest === "string"
          ? errorWithDigest.digest
          : undefined,
    };
  }

  if (typeof error === "string") {
    return {
      name: "Error",
      message: error,
    };
  }

  return {
    name: "UnknownError",
    message: "",
  };
}

function errorText(error: NormalizedError) {
  return [
    error.name,
    error.message,
    error.stack,
    error.digest,
  ]
    .filter(Boolean)
    .join("\n");
}

function classifyPlatformError(
  error: NormalizedError
): PlatformIncidentType {
  const text = errorText(error).toLowerCase();

  if (
    text.includes("emaxconn") ||
    text.includes("max client connections reached") ||
    text.includes("too many connections")
  ) {
    return "DATABASE_CONNECTION_EXHAUSTED";
  }

  if (
    text.includes("prisma") ||
    text.includes("database") ||
    text.includes("postgres") ||
    text.includes("supabase") ||
    text.includes("pgbouncer")
  ) {
    return "DATABASE_ERROR";
  }

  return "SERVER_ERROR";
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  const normalizedError = normalizeError(error);
  const incidentType = classifyPlatformError(normalizedError);

  console.error("[PLATFORM INCIDENT]", {
    type: incidentType,
    errorName: normalizedError.name,
    digest: normalizedError.digest ?? null,

    request: {
      method: request.method,
      path: request.path,
    },

    context: {
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
    },
  });
};