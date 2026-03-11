import type { SubscriptionCategory } from "./types";

export interface SubscriptionSuggestion {
  name: string;
  category: SubscriptionCategory;
}

const S = (name: string, category: SubscriptionCategory): SubscriptionSuggestion => ({
  name,
  category,
});

export const SUBSCRIPTION_SUGGESTIONS: SubscriptionSuggestion[] = [
  // Entertainment
  S("Netflix", "entertainment"),
  S("Spotify", "entertainment"),
  S("YouTube Premium", "entertainment"),
  S("Disney+", "entertainment"),
  S("HBO Max", "entertainment"),
  S("Hulu", "entertainment"),
  S("Apple TV+", "entertainment"),
  S("Amazon Prime Video", "entertainment"),
  S("Crunchyroll", "entertainment"),
  S("PlayStation Plus", "entertainment"),
  S("Xbox Game Pass", "entertainment"),
  S("Nintendo Switch Online", "entertainment"),
  S("Apple Music", "entertainment"),
  S("Tidal", "entertainment"),
  S("Twitch Turbo", "entertainment"),

  // Productivity
  S("Notion", "productivity"),
  S("Figma", "productivity"),
  S("Slack", "productivity"),
  S("Zoom", "productivity"),
  S("GitHub", "productivity"),
  S("GitLab", "productivity"),
  S("Vercel", "productivity"),
  S("ChatGPT Plus", "productivity"),
  S("Claude Pro", "productivity"),
  S("JetBrains", "productivity"),
  S("Microsoft 365", "productivity"),
  S("Google Workspace", "productivity"),
  S("Dropbox", "productivity"),
  S("Canva Pro", "productivity"),
  S("Adobe Creative Cloud", "productivity"),
  S("Linear", "productivity"),
  S("Todoist Pro", "productivity"),

  // Utilities
  S("iCloud+", "utilities"),
  S("Google One", "utilities"),
  S("1Password", "utilities"),
  S("NordVPN", "utilities"),
  S("ExpressVPN", "utilities"),
  S("Bitwarden", "utilities"),
  S("Backblaze", "utilities"),
  S("Cloudflare", "utilities"),
  S("Namecheap", "utilities"),
  S("Twilio", "utilities"),

  // Health
  S("Headspace", "health"),
  S("Calm", "health"),
  S("Strava", "health"),
  S("Peloton", "health"),
  S("MyFitnessPal", "health"),
  S("Fitbit Premium", "health"),
  S("BetterHelp", "health"),
  S("Noom", "health"),

  // Other
  S("Amazon Prime", "other"),
  S("LinkedIn Premium", "other"),
  S("Duolingo Super", "other"),
  S("Medium", "other"),
  S("The New York Times", "other"),
  S("Coursera Plus", "other"),
  S("DoorDash DashPass", "other"),
  S("Discord Nitro", "other"),
].sort((a, b) => a.name.localeCompare(b.name));
