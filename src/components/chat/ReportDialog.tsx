"use client";

import { useState } from "react";
import type { ReportReason } from "@/hooks/useChatSession";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "nudity", label: "Nudity or sexual content" },
  { value: "minor", label: "Looks under 18" },
  { value: "harassment", label: "Harassment or hate" },
  { value: "spam", label: "Spam or advertising" },
  { value: "other", label: "Something else" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, details?: string) => Promise<void>;
}

export function ReportDialog({ open, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState<ReportReason>("nudity");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-plum-deep/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <form
        className="w-full max-w-sm rounded-3xl bg-dusk p-6 shadow-2xl"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await onSubmit(reason, details || undefined).finally(() => setBusy(false));
          setDetails("");
          onClose();
        }}
      >
        <h2 id="report-title" className="font-display text-2xl font-bold">
          Report this stranger
        </h2>
        <p className="mt-1 text-sm text-haze">We&apos;ll end the chat and connect you with someone else.</p>
        <fieldset className="mt-5 space-y-2">
          <legend className="sr-only">Reason</legend>
          {REASONS.map((r) => (
            <label
              key={r.value}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${
                reason === r.value ? "bg-dusk-2" : "hover:bg-dusk-2/50"
              }`}
            >
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="accent-coral"
              />
              {r.label}
            </label>
          ))}
        </fieldset>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Anything we should know? (optional)"
          className="mt-3 w-full resize-none rounded-xl bg-plum-deep px-3 py-2 text-sm placeholder:text-haze/70"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-haze hover:text-mist">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-coral px-5 py-2 font-semibold text-plum-deep hover:bg-coral-hot disabled:opacity-60"
          >
            {busy ? "Reporting…" : "Report and skip"}
          </button>
        </div>
      </form>
    </div>
  );
}
