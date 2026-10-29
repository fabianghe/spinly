import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { absoluteUrl, siteConfig } from "@/config/site";
import { getLandingPage, landingPages } from "@/content/landing-pages";
import { JsonLd, faqJsonLd } from "@/components/marketing/JsonLd";

export function generateStaticParams() {
  return landingPages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = getLandingPage(slug);
  if (!page) return {};
  return {
    title: { absolute: `${page.title} | ${siteConfig.name}` },
    description: page.description,
    alternates: { canonical: `/${page.slug}` },
    openGraph: { title: page.title, description: page.description, url: absoluteUrl(`/${page.slug}`) },
    twitter: { title: page.title, description: page.description },
  };
}

export default async function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getLandingPage(slug);
  if (!page) notFound();
  const others = landingPages.filter((p) => p.slug !== page.slug);

  return (
    <article className="mx-auto w-full max-w-3xl px-5 pt-10 md:px-8 md:pt-16">
      <JsonLd
        data={[
          faqJsonLd(page.faq),
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: siteConfig.name, item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: page.h1, item: absoluteUrl(`/${page.slug}`) },
            ],
          },
        ]}
      />

      <h1 className="font-display text-[clamp(2.4rem,6vw,4rem)] font-extrabold leading-[1] tracking-[-0.03em]">{page.h1}</h1>
      <p className="mt-6 text-lg leading-relaxed text-haze">{page.intro}</p>
      <Link
        href="/chat"
        className="mt-8 inline-block rounded-full bg-coral px-8 py-3.5 font-display text-lg font-bold text-plum-deep transition-colors hover:bg-coral-hot"
      >
        Start video chat
      </Link>

      <div className="mt-16 space-y-10">
        {page.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="font-display text-2xl font-bold">{s.heading}</h2>
            <p className="mt-2 leading-relaxed text-haze">{s.body}</p>
          </section>
        ))}
      </div>

      <section className="mt-16" aria-labelledby="faq">
        <h2 id="faq" className="font-display text-2xl font-bold">
          Questions
        </h2>
        <dl className="mt-4 divide-y divide-white/10">
          {page.faq.map((f) => (
            <div key={f.q} className="py-4">
              <dt className="font-semibold">{f.q}</dt>
              <dd className="mt-1 text-haze">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <nav className="mt-16" aria-label="More comparisons">
        <h2 className="font-semibold">More comparisons</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {others.map((p) => (
            <Link key={p.slug} href={`/${p.slug}`} className="rounded-full bg-dusk px-4 py-2 text-sm hover:bg-dusk-2">
              {p.title.split(" — ")[0]}
            </Link>
          ))}
        </div>
      </nav>
    </article>
  );
}
