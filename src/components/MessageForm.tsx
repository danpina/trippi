"use client";

import { useRef } from "react";
import { sendMessageAction } from "@/app/actions";
import { useServerForm } from "@/lib/useServerForm";

const MAX_HEIGHT_PX = 240;

export default function MessageForm({ threadId }: { threadId: string }) {
  const { state, pending, onSubmit } = useServerForm(sendMessageAction, { resetOnSuccess: true });
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // Grows with the text up to a cap, then scrolls.
  function resize() {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }

  return (
    <form
      onSubmit={onSubmit}
      onReset={() => setTimeout(resize, 0)}
      className="mt-4"
    >
      <div className="flex gap-2 items-end">
        <input type="hidden" name="threadId" value={threadId} />
        <textarea
          ref={areaRef}
          name="body"
          required
          rows={1}
          maxLength={2000}
          className="input flex-1 resize-none overflow-y-auto leading-snug"
          style={{ maxHeight: MAX_HEIGHT_PX }}
          placeholder="Write a message…"
          aria-label="Message"
          onInput={resize}
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
