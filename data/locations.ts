export type Location = {
  code: string;       // ISO 3166-1 alpha-2 (e.g., "GB")
  name: string;       // "United Kingdom"
  currency: string;   // "GBP"
  symbol?: string;    // optional display (e.g., "£")
};

const CURRENCY_ORDER = ["GBP", "EUR", "USD", "CHF", "AED", "SAR", "QAR", "KWD", "BHD", "OMR", "CAD", "AUD", "NZD", "SGD", "HKD", "JPY", "KRW", "CNY", "INR", "ZAR", "NGN", "KES", "EGP", "MAD", "TRY", "BRL", "MXN", "ARS", "CLP", "COP", "PEN", "IDR", "MYR", "THB", "VND", "PHP"];

export const MAJOR_LOCATIONS: Location[] = [
  // EUROPE (EUR + local)
  { code: "GB", name: "United Kingdom", currency: "GBP", symbol: "£" },
  { code: "IE", name: "Ireland", currency: "EUR", symbol: "€" },
  { code: "FR", name: "France", currency: "EUR", symbol: "€" },
  { code: "DE", name: "Germany", currency: "EUR", symbol: "€" },
  { code: "NL", name: "Netherlands", currency: "EUR", symbol: "€" },
  { code: "BE", name: "Belgium", currency: "EUR", symbol: "€" },
  { code: "ES", name: "Spain", currency: "EUR", symbol: "€" },
  { code: "IT", name: "Italy", currency: "EUR", symbol: "€" },
  { code: "PT", name: "Portugal", currency: "EUR", symbol: "€" },
  { code: "SE", name: "Sweden", currency: "SEK" },
  { code: "NO", name: "Norway", currency: "NOK" },
  { code: "DK", name: "Denmark", currency: "DKK" },
  { code: "CH", name: "Switzerland", currency: "CHF", symbol: "CHF" },
  { code: "AT", name: "Austria", currency: "EUR", symbol: "€" },
  { code: "PL", name: "Poland", currency: "PLN" },
  { code: "TR", name: "Turkey", currency: "TRY", symbol: "₺" },

  // NORTH AMERICA
  { code: "US", name: "United States", currency: "USD", symbol: "$" },
  { code: "CA", name: "Canada", currency: "CAD", symbol: "$" },
  { code: "MX", name: "Mexico", currency: "MXN", symbol: "$" },

  // SOUTH AMERICA
  { code: "BR", name: "Brazil", currency: "BRL", symbol: "R$" },
  { code: "AR", name: "Argentina", currency: "ARS" },
  { code: "CL", name: "Chile", currency: "CLP" },
  { code: "CO", name: "Colombia", currency: "COP" },
  { code: "PE", name: "Peru", currency: "PEN" },

  // MIDDLE EAST (GCC + key)
  { code: "AE", name: "United Arab Emirates", currency: "AED", symbol: "د.إ" },
  { code: "SA", name: "Saudi Arabia", currency: "SAR", symbol: "﷼" },
  { code: "QA", name: "Qatar", currency: "QAR" },
  { code: "KW", name: "Kuwait", currency: "KWD" },
  { code: "BH", name: "Bahrain", currency: "BHD" },
  { code: "OM", name: "Oman", currency: "OMR" },
  { code: "JO", name: "Jordan", currency: "JOD" },

  // AFRICA
  { code: "MA", name: "Morocco", currency: "MAD", symbol: "د.م." },
  { code: "DZ", name: "Algeria", currency: "DZD" },
  { code: "TN", name: "Tunisia", currency: "TND" },
  { code: "EG", name: "Egypt", currency: "EGP", symbol: "E£" },
  { code: "NG", name: "Nigeria", currency: "NGN", symbol: "₦" },
  { code: "KE", name: "Kenya", currency: "KES" },
  { code: "ZA", name: "South Africa", currency: "ZAR", symbol: "R" },
  { code: "GH", name: "Ghana", currency: "GHS" },

  // ASIA
  { code: "IN", name: "India", currency: "INR", symbol: "₹" },
  { code: "PK", name: "Pakistan", currency: "PKR" },
  { code: "BD", name: "Bangladesh", currency: "BDT" },
  { code: "CN", name: "China", currency: "CNY", symbol: "¥" },
  { code: "JP", name: "Japan", currency: "JPY", symbol: "¥" },
  { code: "KR", name: "South Korea", currency: "KRW", symbol: "₩" },
  { code: "SG", name: "Singapore", currency: "SGD", symbol: "$" },
  { code: "HK", name: "Hong Kong", currency: "HKD", symbol: "$" },
  { code: "MY", name: "Malaysia", currency: "MYR", symbol: "RM" },
  { code: "ID", name: "Indonesia", currency: "IDR" },
  { code: "TH", name: "Thailand", currency: "THB", symbol: "฿" },
  { code: "VN", name: "Vietnam", currency: "VND", symbol: "₫" },
  { code: "PH", name: "Philippines", currency: "PHP", symbol: "₱" },

  // OCEANIA
  { code: "AU", name: "Australia", currency: "AUD", symbol: "$" },
  { code: "NZ", name: "New Zealand", currency: "NZD", symbol: "$" },
];

export const DEFAULT_LOCATION: Location = { code: "GB", name: "United Kingdom", currency: "GBP", symbol: "£" };

// Used to group currencies in a nice order (GBP/EUR/USD/CHF first, etc.)
export function currencySortKey(currency: string) {
  const idx = CURRENCY_ORDER.indexOf(currency);
  return idx === -1 ? 999 : idx;
}
