import { notFound } from "next/navigation";
import { LoopbackTest } from "./LoopbackTest";

/** Dev-only self-test: two PeerSessions in one page over an in-memory signaling channel. */
export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <LoopbackTest />;
}
