import type { Metadata } from "next";
export default function SafetyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <p className="eyebrow text-ember">Trust &amp; safety</p>
      <h1 className="font-display text-3xl font-medium text-ink mt-1 mb-2">Staying safe on TripSwap</h1>
      <p className="text-slate text-sm mb-10 max-w-lg">
        TripSwap connects you with someone you haven&apos;t met, around a real booking and — for now —
        a payment you arrange between yourselves. A few habits make that much safer.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="font-display italic text-xl text-ink mb-2">Before you commit</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-ink/85">
            <li>
              Check the other person&apos;s rating and review count on their profile. A{" "}
              <span className="font-semibold">Trusted Host</span> badge means at least 10 completed
              conversations rated 4.8 or higher — still verify it matches what they&apos;re telling you.
            </li>
            <li>Keep the early conversation in TripSwap&apos;s chat rather than moving to another app right away — it&apos;s the record you&apos;d point to if something went wrong.</li>
            <li>Ask specific questions about the booking: confirmation numbers, exact dates, what&apos;s included. A real host answers these easily.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display italic text-xl text-ink mb-2">Arranging payment</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-ink/85">
            <li>TripSwap doesn&apos;t process payment yet — you and the other person arrange it directly, so there&apos;s no purchase protection behind it.</li>
            <li>Prefer traceable payment methods over cash or a direct bank transfer to someone you&apos;ve just met.</li>
            <li>Watch for urgency (&quot;pay now or lose it&quot;) — that&apos;s a common pressure tactic. A genuine spare booking can wait for you to feel comfortable.</li>
            <li>Never pay before you can see or verify the actual booking confirmation in the other person&apos;s name.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display italic text-xl text-ink mb-2">Meeting up or traveling together</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-ink/85">
            <li>Tell someone else your plans — where you&apos;re going, who you&apos;re meeting, when you expect to be back.</li>
            <li>For ski, hiking, or other outdoor plans: confirm gear, skill level, and group size expectations up front so nobody&apos;s surprised on the day.</li>
            <li>Trust your instincts. If a conversation feels off, you&apos;re never obligated to continue it.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display italic text-xl text-ink mb-2">If something goes wrong</h2>
          <p className="text-sm text-ink/85">
            Use the <span className="font-semibold">Report</span> link on the listing or the
            conversation — it goes straight to our moderation queue. For anything urgent or unsafe,
            contact local authorities first; reporting to us helps us act on the account, but it
            isn&apos;t an emergency channel.
          </p>
        </section>
      </div>
    </div>
  );
}

export const metadata: Metadata = { title: "Staying safe" };
