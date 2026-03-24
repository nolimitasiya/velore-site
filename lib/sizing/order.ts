// lib/sizing/order.ts

export const SIZE_ORDER = [
  
  "xxs",
  "xs",
  "s",
  "m",
  "l",
  "xl",
  "xxl",
  "3xl",
  "4xl",
  "5xl",

  "one size",

  "petite",
  "tall",
  "plus size",
];

function norm(s: string) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\s+/g, " ");
}

export function sortSizes(a: { slug: string }, b: { slug: string }) {
  const as = norm(a.slug);
  const bs = norm(b.slug);

  const ai = SIZE_ORDER.indexOf(as);
  const bi = SIZE_ORDER.indexOf(bs);

  if (ai === -1 && bi === -1) return as.localeCompare(bs);
  if (ai === -1) return 1;
  if (bi === -1) return -1;
  return ai - bi;
}

/**
 * Filter-pane label:
 * - keep simple sizes lowercase (xs, s, m...)
 * - keep "one size" nicely spaced
 * - keep "petite / tall / plus size" lowercase
 */
function titleCase(s: string) {
  return s
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatSizeLabel(nameOrSlug: string) {
  const s = nameOrSlug
    .trim()
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\s+/g, " ");

  // numeric + letter sizes like 4xl, 5xl
  if (/^\d+xl$/.test(s)) return s.toUpperCase();

  // standard letter sizes
  if (["xxxs","xxs","xs","s","m","l","xl","xxl","xxxl"].includes(s)) {
    return s.toUpperCase();
  }

  if (s === "onesize") return "One Size";
  if (s === "one size") return "One Size";
  if (s === "plus-size") return "Plus Size";
  if (s === "plus size") return "Plus Size";
  if (s === "petite") return "Petite";
  if (s === "tall") return "Tall";

  return titleCase(s);
}