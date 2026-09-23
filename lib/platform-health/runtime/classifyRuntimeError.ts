import {
  PlatformIncidentType,
} from "@prisma/client";

export type NormalizedRuntimeError = {
  name: string;
  message: string;
  stack?: string;
  digest?: string;
};

export function normalizeRuntimeError(
  error: unknown
): NormalizedRuntimeError {
  if (error instanceof Error) {
    const errorWithDigest =
      error as Error & {
        digest?: unknown;
      };

    return {
      name:
        error.name || "Error",

      message:
        error.message || "",

      stack:
        error.stack,

      digest:
        typeof errorWithDigest.digest ===
        "string"
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

function runtimeErrorText(
  error: NormalizedRuntimeError
) {
  return [
    error.name,
    error.message,
    error.stack,
    error.digest,
  ]
    .filter(Boolean)
    .join("\n");
}

export function classifyRuntimeError(
  error: NormalizedRuntimeError
): PlatformIncidentType {
  const text =
    runtimeErrorText(error).toLowerCase();

  if (
    text.includes("emaxconn") ||
    text.includes(
      "max client connections reached"
    ) ||
    text.includes(
      "too many connections"
    )
  ) {
    return PlatformIncidentType
      .DATABASE_CONNECTION_EXHAUSTED;
  }

  if (
    text.includes("prisma") ||
    text.includes("database") ||
    text.includes("postgres") ||
    text.includes("supabase") ||
    text.includes("pgbouncer")
  ) {
    return PlatformIncidentType
      .DATABASE_ERROR;
  }

  return PlatformIncidentType
    .SERVER_ERROR;
}