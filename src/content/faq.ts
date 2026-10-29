import { guestsAllowed, siteConfig } from "@/config/site";

export interface Faq {
  q: string;
  a: string;
}

const n = siteConfig.name;

export const homeFaq: Faq[] = [
  {
    q: `Is ${n} free?`,
    a: `Yes. ${n} is completely free: no subscription, no coins, no download. ${guestsAllowed ? "Open the site and press Start." : "Open the site, sign in and press Start."}`,
  },
  {
    q: "Do I need to download an app?",
    a: `No. ${n} runs in your browser on phones, tablets and computers. Chrome, Safari, Firefox and Edge all work.`,
  },
  guestsAllowed
    ? {
        q: "Do I need an account?",
        a: "No. Press Start and you're in. Strangers only see your country, never your name or contact details.",
      }
    : {
        q: "Why do I have to sign in?",
        a: "Signing in with Google keeps bots and banned users out, which makes every chat better. Strangers only see your first name and country, never your email or full name.",
      },
  {
    q: "Are my video chats recorded?",
    a: `No. Video and audio travel directly between you and the other person (peer-to-peer). ${n} never receives, stores or records your video.`,
  },
  {
    q: "What happens if someone breaks the rules?",
    a: "Press Report. The chat ends instantly, and accounts that collect several reports are suspended automatically and reviewed by a moderator.",
  },
  {
    q: `How old do I need to be to use ${n}?`,
    a: `You must be ${siteConfig.minAge} or older. Accounts reported as underage are suspended.`,
  },
];
