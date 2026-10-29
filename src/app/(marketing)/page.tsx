import Link from "next/link";
import { siteConfig, absoluteUrl } from "@/config/site";
import { homeFaq } from "@/content/faq";
import { landingPages } from "@/content/landing-pages";
import { JsonLd, faqJsonLd } from "@/components/marketing/JsonLd";
import { OnlineNow } from "@/components/marketing/OnlineNow";
import { StrangerShuffle } from "@/components/marketing/StrangerShuffle";
import { getHeroPhotos } from "@/lib/heroPhotos";

const safety = [
  { title: `${siteConfig.minAge}+ only`, body: "Everyone confirms their age before their first chat." },
  { title: "Never recorded", body: "Video goes straight from browser to browser. It never passes through or is stored on our servers." },
  { title: "Report in one tap", body: "The chat ends instantly. Repeat offenders are suspended automatically." },
];

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: siteConfig.name,
            url: siteConfig.url,
            applicationCategory: "SocialNetworkingApplication",
            operatingSystem: "Any (web browser)",
            description: siteConfig.description,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: siteConfig.name,
            url: absoluteUrl("/"),
          },
          faqJsonLd(homeFaq),
        ]}
      />

      {/* Hero */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pb-20 pt-8 md:grid-cols-[1.1fr_1fr] md:px-8 md:pt-16">
        <div>
          <h1 className="font-display text-[clamp(2.75rem,7vw,5.25rem)] font-extrabold leading-[0.95] tracking-[-0.03em]">
            Say hi to someone new.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-haze">
            Free random video chat with strangers from around the world. One tap to start, one tap to skip.
            A simple Omegle and OmeTV alternative that runs in your browser.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link
              href="/chat"
              className="rounded-full bg-coral px-9 py-4 font-display text-xl font-bold text-plum-deep transition-colors hover:bg-coral-hot"
            >
              Start video chat
            </Link>
            <OnlineNow />
          </div>
          <p className="mt-5 text-sm text-haze">Free, no download, works on phone and desktop.</p>
        </div>
        <StrangerShuffle {...getHeroPhotos()} />
      </section>

      {/* Safety */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8" aria-labelledby="safety">
        <div className="rounded-[2rem] bg-dusk px-6 py-12 md:px-12">
          <h2 id="safety" className="max-w-lg font-display text-4xl font-bold tracking-tight">
            Random, not reckless
          </h2>
          <p className="mt-3 max-w-lg text-haze">
            Meeting strangers should be fun. These rules keep it that way.{" "}
            <Link href="/guidelines" className="text-signal underline underline-offset-4">
              Read the guidelines
            </Link>
          </p>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {safety.map((s) => (
              <div key={s.title}>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-haze">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto w-full max-w-3xl px-5 py-16 md:px-8" aria-labelledby="faq">
        <h2 id="faq" className="font-display text-4xl font-bold tracking-tight">
          Questions
        </h2>
        <div className="mt-8 divide-y divide-white/10">
          {homeFaq.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                {f.q}
                <span className="text-2xl text-coral transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-2xl text-haze">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Internal links (helps crawl + long-tail keywords) */}
      <section className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8" aria-labelledby="alts">
        <h2 id="alts" className="font-display text-2xl font-bold">
          Switching from another app?
        </h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {landingPages.map((p) => (
            <Link key={p.slug} href={`/${p.slug}`} className="rounded-full bg-dusk px-4 py-2 text-sm hover:bg-dusk-2">
              {p.title.split(" — ")[0]}
            </Link>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto w-full max-w-6xl px-5 pt-16 text-center md:px-8">
        <p className="font-display text-[clamp(2rem,5vw,3.5rem)] font-extrabold tracking-tight">Someone&apos;s waiting to say hi.</p>
        <Link
          href="/chat"
          className="mt-8 inline-block rounded-full bg-coral px-9 py-4 font-display text-xl font-bold text-plum-deep transition-colors hover:bg-coral-hot"
        >
          Start video chat
        </Link>
      </section>
    </>
  );
}
