import MoneyLabel from "@/components/MoneyLabel";

type ProductPriceProps = {
  price: string | number | null | undefined;
  originalPrice?: string | number | null;
  currency: string | null | undefined;
  badges?: readonly string[];

  size?: "sm" | "md" | "lg";
};

export default function ProductPrice({
  price,
  originalPrice,
  currency,
  badges = [],
  size = "md",
}: ProductPriceProps) {
  if (price == null || price === "") {
    return null;
  }

  const currentPrice = Number(price);
  const previousPrice =
    originalPrice == null || originalPrice === ""
      ? null
      : Number(originalPrice);

  const hasValidSalePrice =
    badges.includes("sale") &&
    Number.isFinite(currentPrice) &&
    previousPrice != null &&
    Number.isFinite(previousPrice) &&
    previousPrice > currentPrice;

  const sizeClasses = {
    sm: {
      current: "text-xs",
      original: "text-xs",
    },
    md: {
      current: "text-sm",
      original: "text-sm",
    },
    lg: {
      current: "text-2xl font-semibold",
      original: "text-lg",
    },
  }[size];

  if (hasValidSalePrice) {
    return (
      <span className="inline-flex items-baseline gap-2">
        <span
          className={`${sizeClasses.original} text-black/40 line-through`}
        >
          <MoneyLabel
            amount={originalPrice}
            currency={currency}
          />
        </span>

        <span
          className={`${sizeClasses.current} text-red-600`}
        >
          <MoneyLabel
            amount={price}
            currency={currency}
          />
        </span>
      </span>
    );
  }

  return (
    <span className={sizeClasses.current}>
      <MoneyLabel
        amount={price}
        currency={currency}
      />
    </span>
  );
}