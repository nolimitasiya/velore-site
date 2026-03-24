export type CountryOption = {
  code: string;
  label: string;
};

const COUNTRY_NAME_MAP: Record<string, string> = {
  GB: "United Kingdom",
  FR: "France",
  DE: "Germany",
  US: "United States",
  CA: "Canada",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  QA: "Qatar",
  KW: "Kuwait",
  BH: "Bahrain",
  OM: "Oman",
  EG: "Egypt",
  MA: "Morocco",
  DZ: "Algeria",
  TN: "Tunisia",
  TR: "Turkey",
  PK: "Pakistan",
  ID: "Indonesia",
  MY: "Malaysia",
};

const ISO2_CODES = [
  "AF","AL","DZ","AD","AO","AG","AR","AM","AU","AT","AZ","BS","BH","BD","BB","BY","BE","BZ","BJ","BT","BO","BA","BW","BR","BN","BG","BF","BI","CV","KH","CM","CA","CF","TD","CL","CN","CO","KM","CG","CD","CR","CI","HR","CU","CY","CZ","DK","DJ","DM","DO","EC","EG","SV","GQ","ER","EE","SZ","ET","FJ","FI","FR","GA","GM","GE","DE","GH","GR","GD","GT","GN","GW","GY","HT","HN","HU","IS","IN","ID","IR","IQ","IE","IL","IT","JM","JP","JO","KZ","KE","KI","KW","KG","LA","LV","LB","LS","LR","LY","LI","LT","LU","MG","MW","MY","MV","ML","MT","MH","MR","MU","MX","FM","MD","MC","MN","ME","MA","MZ","MM","NA","NR","NP","NL","NZ","NI","NE","NG","KP","MK","NO","OM","PK","PW","PA","PG","PY","PE","PH","PL","PT","QA","RO","RU","RW","KN","LC","VC","WS","SM","ST","SA","SN","RS","SC","SL","SG","SK","SI","SB","SO","ZA","KR","SS","ES","LK","SD","SR","SE","CH","SY","TW","TJ","TZ","TH","TL","TG","TO","TT","TN","TR","TM","TV","UG","UA","AE","GB","US","UY","UZ","VU","VA","VE","VN","YE","ZM","ZW",
] as const;

export function normalizeCountryCode(code: string | null | undefined): string | null {
  const iso = String(code ?? "").trim().toUpperCase();
  return iso.length === 2 ? iso : null;
}

export function countryNameFromIso2(code: string): string {
  const iso = normalizeCountryCode(code);
  if (!iso) return "";

  if (COUNTRY_NAME_MAP[iso]) return COUNTRY_NAME_MAP[iso];

  try {
    if (typeof Intl !== "undefined" && "DisplayNames" in Intl) {
      const dn = new Intl.DisplayNames(["en"], { type: "region" });
      return dn.of(iso) || iso;
    }
  } catch {
    // ignore and fall back
  }

  return iso;
}

export const COUNTRY_OPTIONS: CountryOption[] = Array.from(new Set(ISO2_CODES))
  .map((code) => ({
    code,
    label: countryNameFromIso2(code),
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

export function filterCountryOptions(
  options: CountryOption[],
  query: string
): CountryOption[] {
  const q = query.trim().toLowerCase();

  if (!q) return options;

  return options.filter((option) => {
    const label = option.label.toLowerCase();
    const code = option.code.toLowerCase();
    return label.includes(q) || code.includes(q);
  });
}

export function countryOptionsFromCodes(codes: string[]): CountryOption[] {
  const set = new Set(codes.map((code) => normalizeCountryCode(code)).filter(Boolean));
  return COUNTRY_OPTIONS.filter((option) => set.has(option.code));
}