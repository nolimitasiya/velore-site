export function validatePassword(pw: string) {
  const errors: string[] = [];
  if (!pw || pw.length < 10) errors.push("Password must be at least 10 characters.");
  if (!/[a-z]/.test(pw)) errors.push("Password must include a lowercase letter.");
  if (!/[A-Z]/.test(pw)) errors.push("Password must include an uppercase letter.");
  if (!/[0-9]/.test(pw)) errors.push("Password must include a number.");
  if (!/[^A-Za-z0-9]/.test(pw)) errors.push("Password must include a symbol.");

  return { ok: errors.length === 0, errors };
}
