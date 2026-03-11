/**
 * Maps well-known subscription names to their brand color.
 * Used for rendering colored initials in subscription lists.
 * Falls back to category-based colors for unrecognized names.
 */
const BRAND_COLORS: Record<string, string> = {
  // Entertainment
  netflix: "#E50914",
  spotify: "#1DB954",
  "youtube premium": "#FF0000",
  "disney+": "#113CCF",
  "hbo max": "#5822B4",
  hulu: "#1CE783",
  "apple tv+": "#000000",
  "amazon prime video": "#00A8E1",
  crunchyroll: "#F47521",
  "playstation plus": "#003791",
  "xbox game pass": "#107C10",
  "nintendo switch online": "#E60012",
  "apple music": "#FA243C",
  tidal: "#000000",
  "twitch turbo": "#9146FF",

  // Productivity
  notion: "#000000",
  figma: "#A259FF",
  slack: "#4A154B",
  zoom: "#2D8CFF",
  github: "#333333",
  gitlab: "#FC6D26",
  vercel: "#000000",
  "chatgpt plus": "#74AA9C",
  "claude pro": "#D97757",
  jetbrains: "#000000",
  "microsoft 365": "#D83B01",
  "google workspace": "#4285F4",
  dropbox: "#0061FF",
  "canva pro": "#00C4CC",
  "adobe creative cloud": "#FF0000",
  linear: "#5E6AD2",
  "todoist pro": "#E44332",

  // Utilities
  "icloud+": "#3693F5",
  "google one": "#4285F4",
  "1password": "#0572EC",
  nordvpn: "#4687FF",
  expressvpn: "#DA3940",
  bitwarden: "#175DDC",
  backblaze: "#E21E29",
  cloudflare: "#F38020",

  // Health
  headspace: "#F47D31",
  calm: "#4682E9",
  strava: "#FC4C02",
  peloton: "#000000",

  // Other
  "amazon prime": "#FF9900",
  "linkedin premium": "#0A66C2",
  "duolingo super": "#58CC02",
  medium: "#000000",
  "discord nitro": "#5865F2",
};

export function getBrandColor(name: string): string | undefined {
  return BRAND_COLORS[name.toLowerCase()];
}
