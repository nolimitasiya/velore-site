export function formatMoney(
  amount: string | number | null | undefined,
  currency: string,
  locale?: string
) {
  if (amount === null || amount === undefined || amount === "") {
    return "-";
  }

  const n =
    typeof amount === "number"
      ? amount
      : Number(amount);

  if (!Number.isFinite(n)) {
    return "-";
  }

  const loc = locale ?? "en-GB";

  return new Intl.NumberFormat(loc, {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
  }).format(n);
}