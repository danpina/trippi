"use client";

import { sendMessageAction } from "@/app/actions";
import { useServerForm } from "@/lib/useServerForm";

export default function MessageForm({ threadId }: { threadId: string }) {
  const { state, pending, onSubmit } = useServerForm(sendMessageAction, { resetOnSuccess: true });

  return (
    <form onSubmit={onSubmit} className="mt-4">
      <div className="flex gap-2">
        <input type="hidden" name="threadId" value={threadId} />
        <input
          name="body"
          required
          maxLength={2000}
          className="input flex-1"
          placeholder="Write a message…"
          aria-label="Message"
          autoComplete="off"
        />
        <button className="btn-primary" disabled={pending}>
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-ember-deep font-semibold mt-2">
          {state.error}
        </p>
      )}
    </form>
  );
}
