import type { Prisma } from "@prisma/client";

export type PlatformHealthHistoryDb = Pick<
  Prisma.TransactionClient,
  | "platformHealthMeasurement"
  | "platformHealthAggregate"
  | "platformHealthRun"
  | "$queryRaw"
>;