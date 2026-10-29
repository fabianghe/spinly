import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Community guidelines",
  description: `The rules for chatting on ${siteConfig.name}: adults only, no nudity, no harassment, no spam.`,
  alternates: { canonical: "/guidelines" },
};

export default function GuidelinesPage() {
  return (
    <LegalPage title="Community guidelines" updated="October 29, 2026">
      <p>
        {siteConfig.name} works because people treat each other decently. Break these rules and your account will be
        suspended, often automatically.
      </p>
      <h2>Adults only</h2>
      <p>You must be {siteConfig.minAge} or older. If someone looks underage, report them with the &ldquo;Looks under 18&rdquo; option.</p>
      <h2>Keep it clothed</h2>
      <p>No nudity, sexual acts or sexual content of any kind, on camera or in text.</p>
      <h2>Be respectful</h2>
      <ul>
        <li>No harassment, threats, hate speech or slurs.</li>
        <li>No recording, screenshotting or sharing someone else&apos;s video without their consent.</li>
        <li>No asking strangers for money, passwords or personal details.</li>
      </ul>
      <h2>No spam</h2>
      <p>No advertising, links to other services, scripted bots or pre-recorded video.</p>
      <h2>How enforcement works</h2>
      <p>
        Every chat has a Report button. When several different people report the same account within a day, it is
        suspended automatically and reviewed by a moderator. Serious reports (such as a suspected minor) are acted on
        faster.
      </p>
      <h2>Illegal content</h2>
      <p>
        To report illegal content or appeal a decision, email <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.
        We cooperate with law enforcement where the law requires.
      </p>
    </LegalPage>
  );
}
