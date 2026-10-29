import { siteConfig } from "@/config/site";
import type { Faq } from "./faq";

/**
 * Keyword landing pages. Each targets one search intent with unique copy
 * (Google penalises near-duplicate "doorway" pages, so keep them distinct).
 * Add a page = add an entry; sitemap + routes update automatically.
 */
export interface LandingPage {
  slug: string;
  /** <title> — keep under ~60 chars */
  title: string;
  /** meta description — keep under ~155 chars */
  description: string;
  h1: string;
  intro: string;
  sections: { heading: string; body: string }[];
  faq: Faq[];
}

const n = siteConfig.name;

export const landingPages: LandingPage[] = [
  {
    slug: "omegle-alternative",
    title: "Omegle Alternative — Free Random Video Chat",
    description: `Missing Omegle? ${n} brings back one-click video chat with strangers, with reporting, auto-bans and fast matching. Free, in your browser.`,
    h1: "The Omegle alternative that just works",
    intro: `Omegle closed in November 2023, and the internet lost its favourite way to meet a random person face to face. ${n} keeps the part people loved — one button, a new face — and fixes the parts that drove people away.`,
    sections: [
      {
        heading: "Same idea, better moderation",
        body: "On Omegle, repeat offenders came straight back. On " + n + " every chat has a Report button, and accounts that collect several reports are blocked automatically.",
      },
      {
        heading: "Press Next as often as you like",
        body: "Not feeling the conversation? Press Next or hit Esc and you're talking to someone new in a few seconds. There's no limit and no waiting room.",
      },
      {
        heading: "Your video never touches our servers",
        body: "Calls connect directly between the two browsers. We don't record, store or watch your video — we only see that a chat happened, so we can act on reports.",
      },
    ],
    faq: [
      { q: "Why did Omegle shut down?", a: "Its founder closed the site in November 2023, citing the cost and difficulty of fighting misuse. " + n + " is an independent service and not affiliated with Omegle." },
      { q: `Is ${n} like Omegle text chat too?`, a: "Every video chat has a text box, so you can type while you talk — handy for sharing your name or bridging a language gap." },
    ],
  },
  {
    slug: "ometv-alternative",
    title: "OmeTV Alternative — Free Random Video Chat (Ome TV)",
    description: `Looking for an OmeTV alternative? ${n} is a free Ome TV–style random video chat: one tap to meet a stranger, works on mobile and desktop.`,
    h1: "An OmeTV alternative without the clutter",
    intro: `If you came here searching for OmeTV, Ome TV or "ome tv chat", you want the same thing everyone does: tap once and meet a stranger on camera. ${n} does exactly that, in your browser, for free.`,
    sections: [
      {
        heading: "One screen, one button",
        body: "No coins, no gender filters behind a paywall, no pop-ups. The stranger fills the screen, your camera sits in the corner and Next is always one tap away.",
      },
      {
        heading: "No sign-up wall",
        body: "No account, no email, no phone number. Press Start and you're talking to someone within seconds.",
      },
      {
        heading: "Chat and type at the same time",
        body: "Every call has a text chat, handy for spelling your name, sharing where you're from or bridging a language gap.",
      },
    ],
    faq: [
      { q: `Is ${n} the same as OmeTV?`, a: `No. ${n} is an independent service, not affiliated with OmeTV. It offers the same kind of random one-to-one video chat.` },
      { q: "Does it work like the Ome TV app?", a: "Yes, but there's nothing to install. Open the site on your phone, allow the camera and press Start." },
    ],
  },
  {
    slug: "omegle-tv",
    title: "Omegle TV & Omegle Video Chat — Try This Instead",
    description: `Searching for Omegle TV or Omegle video chat? Omegle is gone, but ${n} gives you the same random cam chat with strangers. Free, instant, no app.`,
    h1: "Looking for Omegle video chat?",
    intro: `People still search for "Omegle TV", "Omegle video" and "Omegle cam" every day, but the original site shut down in 2023. ${n} is where you can get that same one-click stranger video chat today.`,
    sections: [
      {
        heading: "The part you remember",
        body: "Press Start, see a random person, say hi. Don't click? Press Next. That loop is the whole product.",
      },
      {
        heading: "What's different",
        body: "Every chat has a Report button, and people who collect several reports are blocked automatically and reviewed by a moderator.",
      },
      {
        heading: "Works everywhere",
        body: "iPhone, Android, laptop or desktop: if your browser has a camera, it works.",
      },
    ],
    faq: [
      { q: "Is Omegle coming back?", a: `Omegle closed permanently in November 2023. ${n} is a separate, independent service.` },
      { q: "Is there an Omegle text-only mode?", a: "You can turn your camera off and type, but the experience is built around video." },
    ],
  },
  {
    slug: "azar-alternative",
    title: "Azar Alternative — Free Video Chat, No Gems",
    description: `A free Azar alternative with no gems or paid filters. ${n} matches you with random people worldwide on live video, right in your browser.`,
    h1: "Like Azar, minus the gems",
    intro: `Swipe-to-match video apps tend to put the good stuff behind in-app currency. ${n} keeps it simple: everyone gets the same instant random matching, free.`,
    sections: [
      {
        heading: "No in-app currency",
        body: "There are no gems, coins or premium filters. Matching is random and fair for everyone.",
      },
      {
        heading: "No install",
        body: "Skip the app store. It's a website: open it, allow your camera and start chatting.",
      },
      {
        heading: "Meet the world",
        body: "Each stranger's country flag sits next to their name, so you know where you've landed.",
      },
    ],
    faq: [
      { q: `Is ${n} affiliated with Azar?`, a: `No. ${n} is an independent random video chat service.` },
      { q: "Can I filter by country or gender?", a: "Not at the moment. Matching is fully random." },
    ],
  },
  {
    slug: "monkey-app-alternative",
    title: "Monkey App Alternative — Random Video Chat for Adults",
    description: `Looking for a Monkey app alternative? ${n} is random video chat for adults 18+, with reporting and instant skipping. Free in your browser.`,
    h1: "A Monkey app alternative for adults",
    intro: `${n} is built for adults only: everyone confirms they're ${siteConfig.minAge}+ before their first chat, and accounts reported as underage are suspended.`,
    sections: [
      {
        heading: `${siteConfig.minAge}+ only`,
        body: "An age confirmation is required before chatting, and the Report button has a dedicated option for anyone who looks underage.",
      },
      {
        heading: "Quick chats, quick skips",
        body: "Talk as long as you want or press Next to move on. There are no timers and no extensions to buy.",
      },
      {
        heading: "No app store needed",
        body: "Everything runs in the browser, on phone or computer.",
      },
    ],
    faq: [
      { q: `Is ${n} affiliated with Monkey?`, a: `No. ${n} is an independent service.` },
      { q: "Why adults only?", a: "Live video with strangers isn't appropriate for minors. Keeping the platform 18+ is a core rule." },
    ],
  },
  {
    slug: "chatroulette-alternative",
    title: "Chatroulette Alternative — Meet Strangers on Cam",
    description: `A fast, free Chatroulette alternative. ${n} pairs you with a random stranger for a live video chat in seconds — no download, works on mobile.`,
    h1: "A faster spin than Chatroulette",
    intro: `${n} is roulette-style video chat built for 2026 browsers: it connects in seconds, works on your phone, and keeps the experience clean with reporting and automatic bans.`,
    sections: [
      {
        heading: "Built for your phone",
        body: "The whole chat fits one screen: the stranger fills the frame, your camera floats in the corner and the Next button sits right under your thumb.",
      },
      {
        heading: "Matched in seconds",
        body: "We pair you with whoever has been waiting longest, so nobody gets stuck in a queue. If a connection fails, " + n + " quietly finds you someone else.",
      },
      {
        heading: "Moderated by the community",
        body: "Every chat has a Report button. Several independent reports suspend an account automatically, and a moderator reviews it.",
      },
    ],
    faq: [
      { q: `Is ${n} affiliated with Chatroulette?`, a: `No. ${n} is an independent random video chat service.` },
      { q: "Can I choose who I talk to?", a: "Matching is random — that's the fun of it. You can skip anyone instantly with Next." },
    ],
  },
  {
    slug: "talk-to-strangers",
    title: "Talk to Strangers — Free Video Chat Online",
    description: `Talk to strangers from around the world on live video. ${n} is free, instant and runs in your browser. One click to meet someone new.`,
    h1: "Talk to strangers, face to face",
    intro: "Some of the best conversations happen with people you'd never otherwise meet. " + n + " drops you into a live video chat with a random person from anywhere in the world.",
    sections: [
      {
        heading: "Practise a language",
        body: "Chatting with someone from another country is the quickest way to get comfortable speaking. The flag next to each name shows where they're joining from.",
      },
      {
        heading: "Beat a boring evening",
        body: "No profiles to fill in and no swiping. Press Start and see who's on the other side.",
      },
      {
        heading: "Stay in control",
        body: "Mute your mic, turn your camera off or skip to the next person at any time. Strangers only ever see your first name and country.",
      },
    ],
    faq: [
      { q: "Is it safe to talk to strangers online?", a: "Keep personal details private, never share passwords or money, and skip or report anyone who makes you uncomfortable. " + n + " never shows your email or surname." },
      { q: "Can I just use text?", a: "You can turn your camera off and type, but most people press Next on a blank screen — a smile gets better conversations." },
    ],
  },
  {
    slug: "free-video-chat",
    title: "Free Video Chat with Random People — No Download",
    description: `Free video chat with random people, right in your browser. No app, no coins, no premium tier. ${n} works on iPhone, Android and desktop.`,
    h1: "Free video chat, no strings attached",
    intro: `${n} is free to use with no premium tier, no coins and no paywalled filters. Everyone gets the same fast matching.`,
    sections: [
      {
        heading: "No download",
        body: "It runs in Chrome, Safari, Firefox and Edge. Allow your camera once and you're in.",
      },
      {
        heading: "Low data use",
        body: "Video adapts to your connection, so it keeps working on mobile data and patchy Wi-Fi.",
      },
      {
        heading: "Private by design",
        body: "Calls go straight from your browser to theirs. Nothing is recorded.",
      },
    ],
    faq: [
      { q: `How does ${n} stay free?`, a: "The app is built on peer-to-peer video, so running it costs very little." },
      { q: "Does it work on iPhone?", a: "Yes — open the site in Safari, allow camera access and press Start." },
    ],
  },
  {
    slug: "meet-new-people-online",
    title: "Meet New People Online — Live Random Video Chat",
    description: `Meet new people online through live, one-to-one video. ${n} matches you with someone new every time you press Next. Free and instant.`,
    h1: "Meet new people, one hello at a time",
    intro: "Social apps are full of feeds. " + n + " is just conversations: one person, live, on video. When it ends, the next one starts.",
    sections: [
      {
        heading: "Real conversations, not profiles",
        body: "There's nothing to curate and nothing to scroll. You see a real person and they see you.",
      },
      {
        heading: "People from everywhere",
        body: "People join from around the world, so you might meet someone in Bucharest, then São Paulo, then Seoul — all in five minutes.",
      },
      {
        heading: "A friendly space",
        body: "Our guidelines are simple: be kind, keep your clothes on, don't spam. People who break them are removed.",
      },
    ],
    faq: [
      { q: "Can I add someone as a friend?", a: "Not yet. If you hit it off, you can swap contact details in the text chat — just be careful who you share them with." },
      { q: "What should I say first?", a: "A simple hi and where you're from works. Most people are curious about each other's country." },
    ],
  },
];

export const getLandingPage = (slug: string) => landingPages.find((p) => p.slug === slug);
