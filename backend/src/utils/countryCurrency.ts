/**
 * Maps common country names (lowercase) to their default currency code.
 * Only includes currencies that the app supports (USD, EUR, GBP, INR, CAD).
 * Falls back to USD for unrecognized countries.
 */
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  // INR
  india: "INR",

  // GBP
  "united kingdom": "GBP",
  uk: "GBP",
  "great britain": "GBP",
  england: "GBP",
  scotland: "GBP",
  wales: "GBP",
  "northern ireland": "GBP",

  // EUR
  germany: "EUR",
  france: "EUR",
  italy: "EUR",
  spain: "EUR",
  netherlands: "EUR",
  belgium: "EUR",
  austria: "EUR",
  portugal: "EUR",
  ireland: "EUR",
  finland: "EUR",
  greece: "EUR",
  luxembourg: "EUR",
  slovakia: "EUR",
  slovenia: "EUR",
  estonia: "EUR",
  latvia: "EUR",
  lithuania: "EUR",
  malta: "EUR",
  cyprus: "EUR",
  croatia: "EUR",

  // CAD
  canada: "CAD",

  // USD
  "united states": "USD",
  "united states of america": "USD",
  usa: "USD",
  us: "USD",
  "puerto rico": "USD",
  guam: "USD",
  "u.s. virgin islands": "USD",
  "american samoa": "USD",
  ecuador: "USD",
  "el salvador": "USD",
  panama: "USD",
};

const FALLBACK_CURRENCY = "USD";

export function currencyForCountry(country: string | undefined | null): string {
  if (!country) return FALLBACK_CURRENCY;
  return COUNTRY_TO_CURRENCY[country.trim().toLowerCase()] ?? FALLBACK_CURRENCY;
}
