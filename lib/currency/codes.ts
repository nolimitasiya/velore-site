// lib/currency/codes.ts

export type CurrencyOption = { code: string; label: string };

// 🌍 Brand can price products in these currencies
export const BRAND_CURRENCY_OPTIONS: CurrencyOption[] = [
  // Major Global
  { code: "GBP", label: "GBP — British Pound" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "CHF", label: "CHF — Swiss Franc" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "NZD", label: "NZD — New Zealand Dollar" },

  // Asia
  { code: "JPY", label: "JPY — Japanese Yen" },
  { code: "CNY", label: "CNY — Chinese Yuan" },
  { code: "HKD", label: "HKD — Hong Kong Dollar" },
  { code: "SGD", label: "SGD — Singapore Dollar" },
  { code: "INR", label: "INR — Indian Rupee" },
  { code: "IDR", label: "IDR — Indonesian Rupiah" },
  { code: "MYR", label: "MYR — Malaysian Ringgit" },
  { code: "PHP", label: "PHP — Philippine Peso" },
  { code: "THB", label: "THB — Thai Baht" },
  { code: "KRW", label: "KRW — South Korean Won" },

  // Middle East
  { code: "AED", label: "AED — UAE Dirham" },
  { code: "SAR", label: "SAR — Saudi Riyal" },
  { code: "QAR", label: "QAR — Qatari Riyal" },
  { code: "KWD", label: "KWD — Kuwaiti Dinar" },
  { code: "OMR", label: "OMR — Omani Rial" },
  { code: "TRY", label: "TRY — Turkish Lira" },
  { code: "ILS", label: "ILS — Israeli Shekel" },

  // Africa
  { code: "ZAR", label: "ZAR — South African Rand" },
  { code: "NGN", label: "NGN — Nigerian Naira" },
  { code: "KES", label: "KES — Kenyan Shilling" },
  { code: "GHS", label: "GHS — Ghanaian Cedi" },
  { code: "MAD", label: "MAD — Moroccan Dirham" },
  { code: "EGP", label: "EGP — Egyptian Pound" },
  { code: "XOF", label: "XOF — West African CFA Franc" },
  { code: "XAF", label: "XAF — Central African CFA Franc" },

  // Europe (non-Euro)
  { code: "SEK", label: "SEK — Swedish Krona" },
  { code: "NOK", label: "NOK — Norwegian Krone" },
  { code: "DKK", label: "DKK — Danish Krone" },
  { code: "PLN", label: "PLN — Polish Zloty" },
  { code: "CZK", label: "CZK — Czech Koruna" },
  { code: "HUF", label: "HUF — Hungarian Forint" },
  { code: "RON", label: "RON — Romanian Leu" },
  { code: "ISK", label: "ISK — Icelandic Krona" },

  // Americas
  { code: "BRL", label: "BRL — Brazilian Real" },
  { code: "MXN", label: "MXN — Mexican Peso" },
  { code: "ARS", label: "ARS — Argentine Peso" },
  { code: "CLP", label: "CLP — Chilean Peso" },
  { code: "COP", label: "COP — Colombian Peso" },
  { code: "PEN", label: "PEN — Peruvian Sol" },

  // Others (emerging e-commerce)
  { code: "BDT", label: "BDT — Bangladeshi Taka" },
  { code: "PKR", label: "PKR — Pakistani Rupee" },
  { code: "LKR", label: "LKR — Sri Lankan Rupee" },
  { code: "VND", label: "VND — Vietnamese Dong" },
];

// ✅ helper: normalize + validate
export function normalizeCurrencyCode(input: unknown) {
  return String(input ?? "").trim().toUpperCase();
}

export function isAllowedBrandCurrency(code: string) {
  return BRAND_CURRENCY_OPTIONS.some((c) => c.code === code);
}
