"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatLine } from "@/lib/chat/chatMachine";

interface Props {
  lines: ChatLine[];
  enabled: boolean;
  onSend: (text: string) => void;
}

export function ChatPanel({ lines, enabled, onSend }: Props) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [lines]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3" aria-live="polite">
        {lines.length === 0 && (
          <p className="pt-6 text-center text-sm text-haze">Messages appear here once you&apos;re connected.</p>
        )}
        {lines.map((l) =>
          l.from === "system" ? (
            <p key={l.id} className="text-center text-xs text-haze">
              {l.text}
            </p>
          ) : (
            <div key={l.id} className={`flex ${l.from === "me" ? "justify-end" : "justify-start"}`}>
              <p
                className={`max-w-[85%] break-words rounded-2xl px-3 py-1.5 text-[15px] leading-snug ${
                  l.from === "me" ? "rounded-br-sm bg-coral text-plum-deep" : "rounded-bl-sm bg-dusk-2 text-mist"
                }`}
              >
                {l.text}
              </p>
            </div>
          ),
        )}
      </div>
      <form
        className="flex gap-2 border-t border-white/5 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          onSend(draft);
          setDraft("");
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!enabled}
          maxLength={500}
          placeholder={enabled ? "Type a message…" : "Waiting for a stranger…"}
          aria-label="Message"
          className="min-w-0 flex-1 rounded-full bg-plum-deep px-4 py-2.5 text-[15px] placeholder:text-haze/70 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!enabled || !draft.trim()}
          className="rounded-full bg-dusk-2 px-4 font-semibold transition-colors hover:bg-signal hover:text-plum-deep disabled:opacity-40 disabled:hover:bg-dusk-2 disabled:hover:text-mist"
        >
          Send
        </button>
      </form>
    </div>
  );
}
