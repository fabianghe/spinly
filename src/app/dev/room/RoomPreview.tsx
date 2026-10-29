"use client";

import type { Session } from "@supabase/supabase-js";
import { ChatRoom } from "@/components/chat/ChatRoom";

const fake = { access_token: "dev", user: { id: "00000000-0000-0000-0000-000000000001" } } as unknown as Session;

export function RoomPreview() {
  return <ChatRoom session={fake} isAdmin />;
}
