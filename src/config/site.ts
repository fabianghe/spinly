/**
 * Single source of truth for branding + SEO.
 * Rename the app here (or via env vars) and everything follows.
 */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Spinly",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  tagline: "Random video chat with strangers",
  description:
    "Free random video chat. Meet new people from around the world in one click — face-to-face, instant, and moderated. A fast Omegle alternative that works in your browser.",
  keywords: [
    "random video chat",
    "video chat with strangers",
    "omegle alternative",
    "ometv alternative",
    "ome tv",
    "omegle tv",
    "chatroulette alternative",
    "azar alternative",
    "monkey app alternative",
    "talk to strangers",
    "free video chat",
    "cam chat",
    "meet new people online",
  ],
  locale: "en_US",
  twitter: process.env.NEXT_PUBLIC_TWITTER_HANDLE ?? "",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "support@example.com",
  minAge: 18,
  /**
   * "guest"  – no account, press Start (needs Supabase "Allow anonymous sign-ins")
   * "google" – Google sign-in required (stronger bans)
   * "both"   – guests by default, Google offered as an option
   */
  authMode: (process.env.NEXT_PUBLIC_AUTH_MODE ?? "guest") as "guest" | "google" | "both",
} as const;

export const guestsAllowed = siteConfig.authMode !== "google";
export const googleEnabled = siteConfig.authMode !== "guest";

export const absoluteUrl = (path = "/") => `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
