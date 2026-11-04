import "server-only";

import { createHash } from "node:crypto";

export function createFeedbackFingerprint(input: {
  type: string;
  category: string | null;
  message: string;
  productId: string | null;
}): string {
  const normalizedMessage = input.message
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

  const payload = JSON.stringify({
    type: input.type,
    category: input.category,
    message: normalizedMessage,
    productId: input.productId,
  });

  return createHash("sha256")
    .update(payload)
    .digest("hex");
}