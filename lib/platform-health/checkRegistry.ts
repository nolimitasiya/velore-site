import {
  PlatformHealthCheckType,
} from "@prisma/client";

export type PlatformHealthCheckDefinition = {
  checkKey: string;
  name: string;
  description: string;
  checkType: PlatformHealthCheckType;
  targetResolver?: "LIVE_PRODUCT_PDP" | "LIVE_PRODUCT_OUTBOUND";

  /*
 * HTTP checks use relative Veilora paths.
 * DATABASE and ANALYTICS checks do not
 * use a path.
 */
  path: string | null;
  httpMethod: "GET" | "POST" | null;

  intervalSeconds: number;
  timeoutMs: number;
  staleAfterSeconds: number;

  failureThreshold: number;
  recoveryThreshold: number;
};

export const PLATFORM_HEALTH_CHECKS = [
  {
    checkKey: "storefront-home",
    name: "Storefront — Home",
    description:
      "Checks that the Veilora storefront homepage can be served successfully.",
    checkType: PlatformHealthCheckType.HTTP,
    path: "/",
    httpMethod: "GET",
    intervalSeconds: 60,
    timeoutMs: 10_000,
    staleAfterSeconds: 180,
    failureThreshold: 3,
    recoveryThreshold: 2,
  },

  {
    checkKey: "storefront-clothing",
    name: "Storefront — Clothing",
    description:
      "Checks the main clothing discovery route and its database-backed catalogue rendering.",
    checkType: PlatformHealthCheckType.HTTP,
    path: "/categories/clothing",
    httpMethod: "GET",
    intervalSeconds: 60,
    timeoutMs: 10_000,
    staleAfterSeconds: 180,
    failureThreshold: 3,
    recoveryThreshold: 2,
  },

  {
    checkKey: "storefront-new-in",
    name: "Storefront — New In",
    description:
      "Checks the New In discovery route and its catalogue queries.",
    checkType: PlatformHealthCheckType.HTTP,
    path: "/new-in",
    httpMethod: "GET",
    intervalSeconds: 60,
    timeoutMs: 10_000,
    staleAfterSeconds: 180,
    failureThreshold: 3,
    recoveryThreshold: 2,
  },

  {
    checkKey: "storefront-sale",
    name: "Storefront — Sale",
    description:
      "Checks the Sale discovery route and its catalogue queries.",
    checkType: PlatformHealthCheckType.HTTP,
    path: "/sale",
    httpMethod: "GET",
    intervalSeconds: 60,
    timeoutMs: 10_000,
    staleAfterSeconds: 180,
    failureThreshold: 3,
    recoveryThreshold: 2,
  },

  {
    checkKey: "storefront-search",
    name: "Storefront — Search",
    description:
      "Checks that storefront search can respond successfully.",
    checkType: PlatformHealthCheckType.HTTP,
    path: "/search?q=dress",
    httpMethod: "GET",
    intervalSeconds: 300,
    timeoutMs: 10_000,
    staleAfterSeconds: 900,
    failureThreshold: 3,
    recoveryThreshold: 2,
  },

  {
    checkKey: "database",
    name: "Database",
    description:
      "Checks that Veilora can acquire a database connection and execute a lightweight query.",
    checkType: PlatformHealthCheckType.DATABASE,
    path: null,
    httpMethod: null,
    intervalSeconds: 60,
    timeoutMs: 5_000,
    staleAfterSeconds: 180,
    failureThreshold: 3,
    recoveryThreshold: 2,
  },

  {
  checkKey: "analytics-ingestion",
  name: "Analytics Ingestion",
  description:
    "Checks that Veilora can access the core analytics persistence layer without creating synthetic shopper data.",
  checkType:
    PlatformHealthCheckType.ANALYTICS,
  path: null,
  httpMethod: null,
  intervalSeconds: 60,
  timeoutMs: 5_000,
  staleAfterSeconds: 180,
  failureThreshold: 3,
  recoveryThreshold: 2,
},

  {
  checkKey: "storefront-pdp",
  name: "Storefront — Product Detail",
  description:
    "Checks a dynamically selected live product detail page.",
  checkType:
    PlatformHealthCheckType.HTTP,
  path: null,
  httpMethod: "GET",
  targetResolver: "LIVE_PRODUCT_PDP",
  intervalSeconds: 60,
  timeoutMs: 10_000,
  staleAfterSeconds: 180,
  failureThreshold: 3,
  recoveryThreshold: 2,
},

{
  checkKey: "outbound-resolution",
  name: "Outbound Resolution",
  description:
    "Checks Veilora's outbound product destination resolver without recording shopper behaviour.",
  checkType:
    PlatformHealthCheckType.HTTP,
  path: null,
  httpMethod: "POST",
  targetResolver: "LIVE_PRODUCT_OUTBOUND",
  intervalSeconds: 60,
  timeoutMs: 10_000,
  staleAfterSeconds: 180,
  failureThreshold: 3,
  recoveryThreshold: 2,
},
] satisfies readonly PlatformHealthCheckDefinition[];