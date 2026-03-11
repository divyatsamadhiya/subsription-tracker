import type { SimpleIcon } from "simple-icons";
import {
  si1password,
  siAnthropic,
  siAppletv,
  siApplemusic,
  siBackblaze,
  siBitwarden,
  siClaude,
  siCloudflare,
  siDiscord,
  siDropbox,
  siDuolingo,
  siExpressvpn,
  siFigma,
  siGithub,
  siGitlab,
  siHbo,
  siHbomax,
  siHeadspace,
  siJetbrains,
  siLinear,
  siMedium,
  siNetflix,
  siNordvpn,
  siNotion,
  siPeloton,
  siSpotify,
  siStrava,
  siTodoist,
  siTwitch,
  siVercel,
  siYoutube,
  siZoom,
} from "simple-icons";

const ICON_ALIASES: Array<[string[], SimpleIcon]> = [
  [["netflix"], siNetflix],
  [["spotify"], siSpotify],
  [["youtube premium", "youtube"], siYoutube],
  [["hbo max"], siHbomax],
  [["hbo"], siHbo],
  [["apple tv+"], siAppletv],
  [["apple music"], siApplemusic],
  [["twitch turbo", "twitch"], siTwitch],
  [["notion"], siNotion],
  [["figma"], siFigma],
  [["zoom"], siZoom],
  [["github"], siGithub],
  [["gitlab"], siGitlab],
  [["vercel"], siVercel],
  [["claude pro", "claude"], siClaude],
  [["anthropic"], siAnthropic],
  [["jetbrains"], siJetbrains],
  [["dropbox"], siDropbox],
  [["1password"], si1password],
  [["nordvpn"], siNordvpn],
  [["expressvpn"], siExpressvpn],
  [["bitwarden"], siBitwarden],
  [["backblaze"], siBackblaze],
  [["cloudflare"], siCloudflare],
  [["headspace"], siHeadspace],
  [["strava"], siStrava],
  [["peloton"], siPeloton],
  [["duolingo super", "duolingo"], siDuolingo],
  [["medium"], siMedium],
  [["discord nitro", "discord"], siDiscord],
  [["todoist pro", "todoist"], siTodoist],
  [["linear"], siLinear],
];

function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

export function getBrandIcon(name: string): SimpleIcon | undefined {
  const normalized = normalizeName(name);
  for (const [aliases, icon] of ICON_ALIASES) {
    if (aliases.some((alias) => normalized.includes(alias))) {
      return icon;
    }
  }
  return undefined;
}
