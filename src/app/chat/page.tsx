import type { Metadata } from "next";
import { ChatApp } from "@/components/chat/ChatApp";

export const metadata: Metadata = {
  title: "Video chat",
  description: "Start a random video chat with a stranger.",
  alternates: { canonical: "/chat" },
  // The app shell has no content worth indexing; the landing pages do the SEO work.
  robots: { index: false, follow: true },
};

export default function ChatPage() {
  return <ChatApp />;
}
