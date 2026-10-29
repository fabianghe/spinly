import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `What ${siteConfig.name} collects, why, and your rights.`,
  alternates: { canonical: "/privacy" },
};

// TEMPLATE — have it reviewed before launch. Fill in the operator details below.
const OPERATOR = process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? "[Your name / company, address, country]";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="October 29, 2026">
      <p>
        This policy explains how {siteConfig.name} (&ldquo;we&rdquo;) handles personal data. The data controller is{" "}
        {OPERATOR}. Contact: <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.
      </p>

      <h2>Video and audio</h2>
      <p>
        Calls are peer-to-peer: video and audio travel directly between you and the other person, encrypted in transit
        (DTLS-SRTP). When a direct connection isn&apos;t possible, encrypted media is relayed through Cloudflare&apos;s
        TURN service, which cannot read it. <strong>We never receive, record or store your video or audio.</strong>
      </p>
      <p>
        Because calls are peer-to-peer, the other person&apos;s browser can technically see your IP address, as with
        any direct video call. Use a VPN if that concerns you.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          If you use the app without an account, we create an anonymous ID stored in your browser. If you sign in with
          Google, we receive your email address, name and profile picture; other users only see your first name.
        </li>
        <li>
          A one-way hash of your IP address, used only to enforce bans (so banned users can&apos;t simply return). IP
          bans expire after 7 days.
        </li>
        <li>Your approximate country, derived from your IP address when you open the chat. We don&apos;t store your raw IP address.</li>
        <li>Chat metadata: who was matched with whom and when, so reports can be acted on.</li>
        <li>Reports you submit or that are made about you, and any moderation decisions.</li>
        <li>Text chat messages are sent directly between browsers and are not stored by us.</li>
      </ul>

      <h2>Why (legal bases)</h2>
      <ul>
        <li>To provide the service you asked for (contract).</li>
        <li>To keep the platform safe, prevent abuse and enforce our rules (legitimate interests, legal obligations).</li>
      </ul>

      <h2>Who processes it</h2>
      <p>
        Supabase (database and authentication), Vercel (website hosting), Cloudflare (media relay) and Google (optional sign-in).
        Some may process data outside the EU under standard contractual clauses.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Account data is kept until you delete your account. Chat metadata and reports are kept for up to 12 months,
        longer only when needed for an ongoing investigation or legal obligation.
      </p>

      <h2>Your rights</h2>
      <p>
        You can request access, correction, deletion or a copy of your data, and object to processing, by emailing us.
        You can also complain to your data protection authority (in Romania: ANSPDCP).
      </p>

      <h2>Cookies</h2>
      <p>We only use cookies that are strictly necessary to keep you signed in. No advertising or tracking cookies.</p>
    </LegalPage>
  );
}
