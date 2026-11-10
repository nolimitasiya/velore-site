const ROLLOUT_ENV_NAME = "SHOPPER_WELCOME_EMAIL_ROLLOUT_AT";

const UTC_TIMESTAMP_PATTERN =
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/;

export function getShopperWelcomeEmailRolloutAt(): Date | null {
  const raw = process.env[ROLLOUT_ENV_NAME];

  if (!raw || !UTC_TIMESTAMP_PATTERN.test(raw)) {
    return null;
  }

  const parsed = new Date(raw);

  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString() !== raw
  ) {
    return null;
  }

  return parsed;
}