/**
 * Maps country names (case-insensitive) to their IANA timezone identifiers.
 * Keys are lowercase for lookup; display uses the original timezone ID.
 */
const COUNTRY_TIMEZONES: Record<string, string[]> = {
  "afghanistan": ["Asia/Kabul"],
  "albania": ["Europe/Tirane"],
  "algeria": ["Africa/Algiers"],
  "argentina": ["America/Argentina/Buenos_Aires"],
  "armenia": ["Asia/Yerevan"],
  "australia": [
    "Australia/Sydney",
    "Australia/Melbourne",
    "Australia/Brisbane",
    "Australia/Perth",
    "Australia/Adelaide",
    "Australia/Darwin",
    "Australia/Hobart",
  ],
  "austria": ["Europe/Vienna"],
  "azerbaijan": ["Asia/Baku"],
  "bahrain": ["Asia/Bahrain"],
  "bangladesh": ["Asia/Dhaka"],
  "belarus": ["Europe/Minsk"],
  "belgium": ["Europe/Brussels"],
  "bolivia": ["America/La_Paz"],
  "brazil": [
    "America/Sao_Paulo",
    "America/Manaus",
    "America/Bahia",
    "America/Fortaleza",
    "America/Recife",
    "America/Belem",
    "America/Cuiaba",
    "America/Rio_Branco",
  ],
  "brunei": ["Asia/Brunei"],
  "bulgaria": ["Europe/Sofia"],
  "cambodia": ["Asia/Phnom_Penh"],
  "cameroon": ["Africa/Douala"],
  "canada": [
    "America/Toronto",
    "America/Vancouver",
    "America/Edmonton",
    "America/Winnipeg",
    "America/Halifax",
    "America/St_Johns",
    "America/Regina",
  ],
  "chile": ["America/Santiago"],
  "china": ["Asia/Shanghai"],
  "colombia": ["America/Bogota"],
  "costa rica": ["America/Costa_Rica"],
  "croatia": ["Europe/Zagreb"],
  "cuba": ["America/Havana"],
  "cyprus": ["Asia/Nicosia"],
  "czech republic": ["Europe/Prague"],
  "czechia": ["Europe/Prague"],
  "denmark": ["Europe/Copenhagen"],
  "dominican republic": ["America/Santo_Domingo"],
  "ecuador": ["America/Guayaquil"],
  "egypt": ["Africa/Cairo"],
  "el salvador": ["America/El_Salvador"],
  "estonia": ["Europe/Tallinn"],
  "ethiopia": ["Africa/Addis_Ababa"],
  "finland": ["Europe/Helsinki"],
  "france": ["Europe/Paris"],
  "georgia": ["Asia/Tbilisi"],
  "germany": ["Europe/Berlin"],
  "ghana": ["Africa/Accra"],
  "greece": ["Europe/Athens"],
  "guatemala": ["America/Guatemala"],
  "honduras": ["America/Tegucigalpa"],
  "hong kong": ["Asia/Hong_Kong"],
  "hungary": ["Europe/Budapest"],
  "iceland": ["Atlantic/Reykjavik"],
  "india": ["Asia/Kolkata"],
  "indonesia": [
    "Asia/Jakarta",
    "Asia/Makassar",
    "Asia/Jayapura",
  ],
  "iran": ["Asia/Tehran"],
  "iraq": ["Asia/Baghdad"],
  "ireland": ["Europe/Dublin"],
  "israel": ["Asia/Jerusalem"],
  "italy": ["Europe/Rome"],
  "jamaica": ["America/Jamaica"],
  "japan": ["Asia/Tokyo"],
  "jordan": ["Asia/Amman"],
  "kazakhstan": ["Asia/Almaty", "Asia/Aqtau"],
  "kenya": ["Africa/Nairobi"],
  "kuwait": ["Asia/Kuwait"],
  "laos": ["Asia/Vientiane"],
  "latvia": ["Europe/Riga"],
  "lebanon": ["Asia/Beirut"],
  "libya": ["Africa/Tripoli"],
  "lithuania": ["Europe/Vilnius"],
  "luxembourg": ["Europe/Luxembourg"],
  "malaysia": ["Asia/Kuala_Lumpur"],
  "maldives": ["Indian/Maldives"],
  "malta": ["Europe/Malta"],
  "mauritius": ["Indian/Mauritius"],
  "mexico": [
    "America/Mexico_City",
    "America/Cancun",
    "America/Tijuana",
    "America/Chihuahua",
    "America/Mazatlan",
  ],
  "mongolia": ["Asia/Ulaanbaatar"],
  "morocco": ["Africa/Casablanca"],
  "mozambique": ["Africa/Maputo"],
  "myanmar": ["Asia/Yangon"],
  "nepal": ["Asia/Kathmandu"],
  "netherlands": ["Europe/Amsterdam"],
  "new zealand": ["Pacific/Auckland", "Pacific/Chatham"],
  "nicaragua": ["America/Managua"],
  "nigeria": ["Africa/Lagos"],
  "north korea": ["Asia/Pyongyang"],
  "norway": ["Europe/Oslo"],
  "oman": ["Asia/Muscat"],
  "pakistan": ["Asia/Karachi"],
  "panama": ["America/Panama"],
  "paraguay": ["America/Asuncion"],
  "peru": ["America/Lima"],
  "philippines": ["Asia/Manila"],
  "poland": ["Europe/Warsaw"],
  "portugal": ["Europe/Lisbon", "Atlantic/Azores"],
  "qatar": ["Asia/Qatar"],
  "romania": ["Europe/Bucharest"],
  "russia": [
    "Europe/Moscow",
    "Europe/Kaliningrad",
    "Asia/Yekaterinburg",
    "Asia/Novosibirsk",
    "Asia/Krasnoyarsk",
    "Asia/Irkutsk",
    "Asia/Yakutsk",
    "Asia/Vladivostok",
    "Asia/Kamchatka",
  ],
  "saudi arabia": ["Asia/Riyadh"],
  "senegal": ["Africa/Dakar"],
  "serbia": ["Europe/Belgrade"],
  "singapore": ["Asia/Singapore"],
  "slovakia": ["Europe/Bratislava"],
  "slovenia": ["Europe/Ljubljana"],
  "south africa": ["Africa/Johannesburg"],
  "south korea": ["Asia/Seoul"],
  "spain": ["Europe/Madrid", "Atlantic/Canary"],
  "sri lanka": ["Asia/Colombo"],
  "sudan": ["Africa/Khartoum"],
  "sweden": ["Europe/Stockholm"],
  "switzerland": ["Europe/Zurich"],
  "syria": ["Asia/Damascus"],
  "taiwan": ["Asia/Taipei"],
  "tanzania": ["Africa/Dar_es_Salaam"],
  "thailand": ["Asia/Bangkok"],
  "tunisia": ["Africa/Tunis"],
  "turkey": ["Europe/Istanbul"],
  "turkiye": ["Europe/Istanbul"],
  "uganda": ["Africa/Kampala"],
  "ukraine": ["Europe/Kyiv"],
  "united arab emirates": ["Asia/Dubai"],
  "uae": ["Asia/Dubai"],
  "united kingdom": ["Europe/London"],
  "uk": ["Europe/London"],
  "united states": [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Phoenix",
    "America/Anchorage",
    "Pacific/Honolulu",
  ],
  "usa": [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Phoenix",
    "America/Anchorage",
    "Pacific/Honolulu",
  ],
  "us": [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Phoenix",
    "America/Anchorage",
    "Pacific/Honolulu",
  ],
  "uruguay": ["America/Montevideo"],
  "uzbekistan": ["Asia/Tashkent"],
  "venezuela": ["America/Caracas"],
  "vietnam": ["Asia/Ho_Chi_Minh"],
  "yemen": ["Asia/Aden"],
  "zambia": ["Africa/Lusaka"],
  "zimbabwe": ["Africa/Harare"],
};

/** Short aliases that should not appear in the country dropdown. */
const ALIASES = new Set(["usa", "us", "uk", "uae", "czechia", "turkiye"]);

/**
 * Title-case a country key for display.
 * "united states" → "United States", "hong kong" → "Hong Kong"
 */
function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Returns a sorted list of { value, label } entries for all countries
 * (excluding short aliases). `value` is the lowercase key used for lookup;
 * `label` is the title-cased display name.
 */
export function getCountryList(): { value: string; label: string }[] {
  return Object.keys(COUNTRY_TIMEZONES)
    .filter((k) => !ALIASES.has(k))
    .sort((a, b) => a.localeCompare(b))
    .map((k) => ({ value: k, label: titleCase(k) }));
}

/**
 * Return the IANA timezones for a given country name.
 * Case-insensitive lookup. Returns empty array if country is not found.
 */
export function getTimezonesForCountry(country: string): string[] {
  return COUNTRY_TIMEZONES[country.trim().toLowerCase()] ?? [];
}

/**
 * Format an IANA timezone ID for display.
 * "America/New_York" → "America/New York (UTC-5)"
 */
export function formatTimezoneLabel(tz: string): string {
  try {
    const now = new Date();
    const offsetMinutes = getTimezoneOffset(tz, now);
    const sign = offsetMinutes <= 0 ? "+" : "-";
    const absMinutes = Math.abs(offsetMinutes);
    const hours = Math.floor(absMinutes / 60);
    const minutes = absMinutes % 60;
    const offsetStr = minutes > 0 ? `${sign}${hours}:${String(minutes).padStart(2, "0")}` : `${sign}${hours}`;
    const displayName = tz.replace(/_/g, " ");
    return `${displayName} (UTC${offsetStr})`;
  } catch {
    return tz.replace(/_/g, " ");
  }
}

function getTimezoneOffset(tz: string, date: Date): number {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = date.toLocaleString("en-US", { timeZone: tz });
  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  return (utcDate.getTime() - tzDate.getTime()) / 60000;
}
