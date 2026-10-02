type LengthMatchCandidate = {
  status: "MATCH" | "SHORTER" | "LONGER";
};

export function selectUniqueLengthMatch<
  T extends LengthMatchCandidate,
>(
  candidates: readonly T[]
): T | null {
  const matches = candidates.filter(
    (candidate) => candidate.status === "MATCH"
  );

  return matches.length === 1
    ? matches[0]
    : null;
}