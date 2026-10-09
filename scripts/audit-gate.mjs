import { spawnSync } from "node:child_process";

const ALLOWED_ADVISORY = "GHSA-vfj7-8cjw-p6xm";
const HIGH_SEVERITIES = new Set(["high", "critical"]);

function requireNpmCli() {
  const npmCli = process.env.npm_execpath;

  if (!npmCli) {
    throw new Error(
      "npm executable path unavailable. Run the audit gate through npm."
    );
  }

  return npmCli;
}

function runAudit(args) {
  const result = spawnSync(
    process.execPath,
    [requireNpmCli(), "audit", "--json", ...args],
    {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    }
  );

  if (result.error || ![0, 1].includes(result.status)) {
    throw new Error(
      `npm audit failed: ${
        result.error?.message ?? result.stderr ?? result.status
      }`
    );
  }

  let audit;

  try {
    audit = JSON.parse(result.stdout);
  } catch {
    throw new Error("npm audit returned invalid JSON.");
  }

  if (
    !audit ||
    typeof audit !== "object" ||
    !audit.vulnerabilities ||
    typeof audit.vulnerabilities !== "object" ||
    !audit.metadata?.vulnerabilities
  ) {
    throw new Error("npm audit returned an unexpected response.");
  }

  return audit;
}

function getHighVulnerabilities(audit) {
  return Object.entries(audit.vulnerabilities).filter(
    ([, vulnerability]) => HIGH_SEVERITIES.has(vulnerability.severity)
  );
}

function collectAdvisories(
  name,
  vulnerabilities,
  visited = new Set()
) {
  if (visited.has(name)) {
    return new Set();
  }

  visited.add(name);

  const vulnerability = vulnerabilities[name];

  if (!vulnerability || !Array.isArray(vulnerability.via)) {
    throw new Error(`Missing vulnerability details for ${name}.`);
  }

  const advisories = new Set();

  for (const entry of vulnerability.via) {
    if (typeof entry === "string") {
      if (!vulnerabilities[entry]) {
        throw new Error(
          `Unresolved vulnerability dependency: ${entry}`
        );
      }

      const nestedAdvisories = collectAdvisories(
        entry,
        vulnerabilities,
        visited
      );

      for (const advisory of nestedAdvisories) {
        advisories.add(advisory);
      }
    } else if (
      entry &&
      typeof entry === "object" &&
      typeof entry.url === "string"
    ) {
      const match = entry.url.match(
        /GHSA-[a-z0-9-]+/i
      );

      if (!match) {
        throw new Error(
          `Unknown advisory identifier for ${name}.`
        );
      }

      advisories.add(match[0]);
    } else {
      throw new Error(
        `Unexpected advisory format for ${name}.`
      );
    }
  }

  if (advisories.size === 0) {
    throw new Error(
      `No advisory could be resolved for ${name}.`
    );
  }

  return advisories;
}

function main() {
  console.log("Checking production dependencies...");

  const production = runAudit(["--omit=dev"]);

  const productionHigh = getHighVulnerabilities(production);

  if (productionHigh.length > 0) {
    throw new Error(
      `Production audit failed: ${productionHigh
        .map(([name]) => name)
        .join(", ")}`
    );
  }

  console.log("Production audit passed.");

  console.log("Checking all dependencies...");

  const full = runAudit([]);

  const high = getHighVulnerabilities(full);

const EXPECTED_CHAIN = new Set([
  "eslint-config-next",
  "@next/eslint-plugin-next",
  "fast-glob",
  "micromatch",
  "braces",
]);

for (const [name] of high) {
  if (!EXPECTED_CHAIN.has(name)) {
    throw new Error(
      `Unexpected vulnerable package: ${name}`
    );
  }
}

  for (const [name] of high) {
    const advisories = collectAdvisories(
      name,
      full.vulnerabilities
    );

    for (const advisory of advisories) {
      if (advisory !== ALLOWED_ADVISORY) {
        throw new Error(
          `Unexpected high/critical vulnerability: ${name} (${advisory})`
        );
      }
    }
  }

  console.log(
    `Security audit passed. ${high.length} known development dependency findings accepted under ${ALLOWED_ADVISORY}.`
  );
}

if (process.argv[1]?.endsWith("audit-gate.mjs")) {
  try {
    main();
  } catch (error) {
    console.error("SECURITY AUDIT FAILED:", error.message);
    process.exitCode = 1;
  }
}

export { collectAdvisories };