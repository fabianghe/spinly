import { notFound } from "next/navigation";
import { RoomPreview } from "./RoomPreview";

/** Dev-only: renders the chat room UI with a fake session (backend calls just fail). */
export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <RoomPreview />;
}
