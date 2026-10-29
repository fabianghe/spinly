import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Terms of service",
  description: `The terms for using ${siteConfig.name}.`,
  alternates: { canonical: "/terms" },
};

// TEMPLATE — have it reviewed before launch.
const OPERATOR = process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? "[Your name / company, address, country]";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="October 29, 2026">
      <p>
        {siteConfig.name} is operated by {OPERATOR}. By using it you agree to these terms and to our{" "}
        <Link href="/guidelines">community guidelines</Link> and <Link href="/privacy">privacy policy</Link>.
      </p>
      <h2>Eligibility</h2>
      <p>You must be at least {siteConfig.minAge} years old. Accounts we believe belong to minors are suspended.</p>
      <h2>Live content from strangers</h2>
      <p>
        You&apos;ll be talking to random people in real time. We can&apos;t watch chats as they happen, so you may see
        content you find offensive. Skip or report anyone who breaks the rules. You are responsible for what you show
        and say.
      </p>
      <h2>Prohibited use</h2>
      <p>
        Anything illegal or against the community guidelines, including sexual content, harassment, spam, impersonation,
        recording others without consent, and automated access.
      </p>
      <h2>Suspension</h2>
      <p>
        We may suspend or remove accounts that break these terms, with or without notice. You can appeal by emailing{" "}
        <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.
      </p>
      <h2>No warranty</h2>
      <p>
        The service is provided &ldquo;as is&rdquo;. To the extent allowed by law, we aren&apos;t liable for user
        conduct or for losses arising from use of the service.
      </p>
      <h2>Changes</h2>
      <p>We may update these terms. Continued use after changes means you accept them.</p>
    </LegalPage>
  );
}
