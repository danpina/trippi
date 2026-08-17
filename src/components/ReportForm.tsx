"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { submitReportAction } from "@/app/actions";

const REASONS = ["Spam or scam", "Inappropriate content", "Harassment or abuse", "Fake listing", "Other"];

export default function ReportForm({
  targetType,
  targetId,
  label,
}: {
  targetType: "listing" | "user";
  targetId: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(submitReportAction, undefined);

  if (state?.success) {
    return <p className="text-xs text-slate mt-2">Thanks — this has been reported for review.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-slate hover:text-ember-deep underline underline-offset-2"
      >
        {label}
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-2 card p-4 space-y-2 max-w-sm">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <label className="eyebrow text-slate">Reason</label>
      <select name="reasonCode" required className="input" defaultValue="">
        <option value="" disabled>
          Select a reason…
        </option>
        {REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <textarea name="details" rows={2} className="input" placeholder="Optional details…" />
      {state?.error && <p className="text-xs text-ember-deep font-semibold">{state.error}</p>}
      <div className="flex gap-3 items-center pt-1">
        <button className="btn-secondary !py-1.5 !px-3 text-xs">Submit report</button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate hover:text-ink">
          Cancel
        </button>
      </div>
    </form>
  );
}
