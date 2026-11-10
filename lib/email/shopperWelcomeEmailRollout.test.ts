import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  getShopperWelcomeEmailRolloutAt,
} from "./shopperWelcomeEmailRollout";

const ENV_NAME = "SHOPPER_WELCOME_EMAIL_ROLLOUT_AT";
const originalValue = process.env[ENV_NAME];

afterEach(() => {
  if (originalValue === undefined) {
    delete process.env[ENV_NAME];
  } else {
    process.env[ENV_NAME] = originalValue;
  }
});

describe("shopper welcome-email rollout configuration", () => {
  it("fails closed when the variable is missing", () => {
    delete process.env[ENV_NAME];

    expect(getShopperWelcomeEmailRolloutAt()).toBeNull();
  });

  it("fails closed for an empty value", () => {
    process.env[ENV_NAME] = "";

    expect(getShopperWelcomeEmailRolloutAt()).toBeNull();
  });

  it("fails closed for an invalid value", () => {
    process.env[ENV_NAME] = "tomorrow";

    expect(getShopperWelcomeEmailRolloutAt()).toBeNull();
  });

  it("rejects timestamps without an explicit UTC timezone", () => {
    process.env[ENV_NAME] = "2026-11-15T00:00:00.000";

    expect(getShopperWelcomeEmailRolloutAt()).toBeNull();
  });

  it("rejects timestamps with a timezone offset", () => {
    process.env[ENV_NAME] = "2026-11-15T01:00:00.000+01:00";

    expect(getShopperWelcomeEmailRolloutAt()).toBeNull();
  });

  it("rejects impossible calendar dates", () => {
    process.env[ENV_NAME] = "2026-02-30T00:00:00.000Z";

    expect(getShopperWelcomeEmailRolloutAt()).toBeNull();
  });

  it("accepts a valid UTC rollout timestamp", () => {
    process.env[ENV_NAME] = "2026-11-15T00:00:00.000Z";

    expect(
      getShopperWelcomeEmailRolloutAt()?.toISOString()
    ).toBe("2026-11-15T00:00:00.000Z");
  });

  it("accepts a valid leap-day timestamp", () => {
    process.env[ENV_NAME] = "2028-02-29T12:30:00.000Z";

    expect(
      getShopperWelcomeEmailRolloutAt()?.toISOString()
    ).toBe("2028-02-29T12:30:00.000Z");
  });

  it("rejects whitespace around the timestamp", () => {
    process.env[ENV_NAME] = " 2026-11-15T00:00:00.000Z ";

    expect(getShopperWelcomeEmailRolloutAt()).toBeNull();
  });
});