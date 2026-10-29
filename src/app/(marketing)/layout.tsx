import Link from "next/link";
import { siteConfig } from "@/config/site";
import { landingPages } from "@/content/landing-pages";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <Link href="/" className="font-display text-2xl font-extrabold tracking-tight">
          {siteConfig.name}
        </Link>
        <Link
          href="/chat"
          className="rounded-full bg-mist px-5 py-2.5 font-semibold text-plum-deep transition-colors hover:bg-coral"
        >
          Start chatting
        </Link>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-24 border-t border-white/10">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
          <div>
            <p className="font-display text-xl font-extrabold">{siteConfig.name}</p>
            <p className="mt-2 max-w-xs text-sm text-haze">
              Free random video chat for adults {siteConfig.minAge}+. Calls are peer-to-peer and never recorded.
            </p>
          </div>
          <nav aria-label="Alternatives">
            <p className="font-semibold">Compare</p>
            <ul className="mt-3 space-y-2 text-sm text-haze">
              {landingPages.map((p) => (
                <li key={p.slug}>
                  <Link href={`/${p.slug}`} className="hover:text-mist">
                    {p.h1.replace(/\?$/, "")}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Legal">
            <p className="font-semibold">Safety & legal</p>
            <ul className="mt-3 space-y-2 text-sm text-haze">
              <li><Link href="/guidelines" className="hover:text-mist">Community guidelines</Link></li>
              <li><Link href="/terms" className="hover:text-mist">Terms of service</Link></li>
              <li><Link href="/privacy" className="hover:text-mist">Privacy policy</Link></li>
              <li><a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-mist">Contact</a></li>
            </ul>
          </nav>
        </div>
        <p className="mx-auto max-w-6xl px-5 pb-10 text-xs text-haze/70 md:px-8">
          © <Year /> {siteConfig.name}. {siteConfig.name} is an independent service and is not affiliated with
          OmeTV, Omegle, Chatroulette, Azar or Monkey. Product names are trademarks of their respective owners.
        </p>
      </footer>
    </>
  );
}

async function Year() {
  "use cache";
  return <>{new Date().getFullYear()}</>;
}
