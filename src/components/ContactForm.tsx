"use client";

import { contactOwnerAction } from "@/app/actions";
import { useServerForm } from "@/lib/useServerForm";

export default function ContactForm({ listingId }: { listingId: string }) {
  const { state, pending, onSubmit } = useServerForm(contactOwnerAction);

  return (
    <form onSubmit={onSubmit} className="card p-5">
      <input type="hidden" name="listingId" value={listingId} />
      <label className="eyebrow text-slate" htmlFor="contact-message">
        Message the host
      </label>
      <textarea
        id="contact-message"
        name="message"
        required
        maxLength={2000}
        rows={3}
        className="input mt-1.5"
        placeholder="Hi! Is this still available? I'd love to..."
      />
      {state?.error && (
        <p role="alert" className="text-sm text-ember-deep font-semibold mt-2">
          {state.error}
        </p>
      )}
      <button className="btn-primary mt-3" disabled={pending}>
        {pending ? "Sending…" : "Contact"}
      </button>
      <p className="text-xs text-slate mt-3">
        Meeting up or arranging payment?{" "}
        <a href="/safety" className="text-ember font-semibold hover:underline">
          Read our safety tips
        </a>
        .
      </p>
      <p className="text-xs text-slate mt-1.5">
        TripSwap only connects you two — we take no responsibility for what&apos;s arranged here. See our{" "}
        <a href="/terms" className="text-ember font-semibold hover:underline">
          terms &amp; disclaimer
        </a>
        .
      </p>
    </form>
  );
}
