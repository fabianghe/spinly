import type { Partner } from "@/lib/match/Matchmaker";

/**
 * Explicit state machine for one chat session.
 *
 *   idle ──start──▶ searching ──matched──▶ connecting ──rtc ok──▶ connected
 *     ▲                ▲  ▲                    │                     │
 *     │                │  └──── partner left / failed / next ────────┘
 *     └──── stop ──────┴──────────────────────────────────────────────
 *
 *   any ──banned──▶ banned (terminal)
 */
export type ChatPhase = "idle" | "searching" | "connecting" | "connected" | "banned";

export interface ChatLine {
  id: number;
  from: "me" | "them" | "system";
  text: string;
}

export interface ChatState {
  phase: ChatPhase;
  matchId: string | null;
  partner: Partner | null;
  lines: ChatLine[];
  notice: string | null;
  error: string | null;
}

export type ChatAction =
  | { type: "SEARCH"; notice?: string }
  | { type: "MATCHED"; matchId: string; partner: Partner }
  | { type: "CONNECTED" }
  | { type: "STOP" }
  | { type: "BANNED" }
  | { type: "ERROR"; message: string }
  | { type: "LINE"; from: ChatLine["from"]; text: string };

export const initialChatState: ChatState = {
  phase: "idle",
  matchId: null,
  partner: null,
  lines: [],
  notice: null,
  error: null,
};

let lineId = 0;
const line = (from: ChatLine["from"], text: string): ChatLine => ({ id: ++lineId, from, text });

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  if (state.phase === "banned") return state; // terminal

  switch (action.type) {
    case "SEARCH":
      return { ...initialChatState, phase: "searching", notice: action.notice ?? null };
    case "MATCHED":
      if (state.phase !== "searching") return state;
      return { ...state, phase: "connecting", matchId: action.matchId, partner: action.partner, lines: [], error: null, notice: null };
    case "CONNECTED":
      if (state.phase !== "connecting") return state;
      return {
        ...state,
        phase: "connected",
        notice: null,
        lines: [line("system", "You're now chatting with a random stranger. Say hi!")],
      };
    case "STOP":
      return { ...initialChatState };
    case "BANNED":
      return { ...initialChatState, phase: "banned" };
    case "ERROR":
      return { ...state, error: action.message };
    case "LINE":
      if (state.phase !== "connected") return state;
      return { ...state, lines: [...state.lines.slice(-199), line(action.from, action.text)] };
  }
}
