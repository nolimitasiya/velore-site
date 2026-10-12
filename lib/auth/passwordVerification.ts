import "server-only";

import bcrypt from "bcryptjs";

// Replace this value with the bcrypt hash generated in Step 1.
const DUMMY_PASSWORD_HASH =
  "$2b$12$CYGDTuYie34xA5l902z7AemgQBYqYrzhmQt.WxU6v2yC6MWq53pdi";

/**
 * Always performs a bcrypt comparison, including when
 * the account does not exist.
 *
 * This reduces account-existence timing differences.
 */
export async function verifyLoginPassword(
  password: string,
  storedHash: string | null | undefined,
): Promise<boolean> {
  const hash = storedHash || DUMMY_PASSWORD_HASH;

  const valid = await bcrypt.compare(password, hash);

  return Boolean(storedHash) && valid;
}
