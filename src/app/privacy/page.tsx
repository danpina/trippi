import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <p className="eyebrow text-ember">Legal</p>
      <h1 className="font-display text-3xl font-medium text-ink mt-1 mb-2">Privacy policy</h1>
      <p className="text-slate text-sm mb-10 max-w-lg">
        This is a plain-language placeholder describing what TripSwap does with personal data while it&apos;s in early
        access. It will be replaced by a lawyer-drafted policy before the service is promoted to the public.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="font-display italic text-xl text-ink mb-2">What we collect</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-ink/85">
            <li>Account details: your name, email address and a hashed (never plain-text) password.</li>
            <li>Optional profile details: age and gender, used only for a host&apos;s filtering preferences on a listing. They are never shown on your public profile.</li>
            <li>Content you create: listings (including locations and photos), messages, ratings and reports.</li>
            <li>Your terms-acceptance date, and technical data needed to keep the service secure (for example failed-login counts).</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display italic text-xl text-ink mb-2">What is public</h2>
          <p className="text-sm text-ink/85">
            Your display name, join date, rating and active listings are visible to anyone on your public profile. Your
            email address is never shown to other users; messages are visible only to the two people in a conversation
            (and to moderators if a conversation is reported).
          </p>
        </section>

        <section>
          <h2 className="font-display italic text-xl text-ink mb-2">Why we use it</h2>
          <p className="text-sm text-ink/85">
            To run the service: showing listings, letting people contact each other, building trust through ratings,
            moderating abuse, keeping accounts secure, and sending you email about activity such as new messages or
            password resets. We don&apos;t sell personal data and we don&apos;t run advertising trackers.
          </p>
        </section>

        <section>
          <h2 className="font-display italic text-xl text-ink mb-2">Who else handles it</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-ink/85">
            <li>Hosting and database: Vercel and Supabase (EU region).</li>
            <li>Photo storage: Supabase Storage.</li>
            <li>Maps and place search: MapTiler receives the places you type into location search and the map areas you view.</li>
            <li>Email: a transactional email provider receives your address and the message text when we email you.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display italic text-xl text-ink mb-2">Cookies</h2>
          <p className="text-sm text-ink/85">
            TripSwap sets a single, essential cookie to keep you logged in. There are no analytics or advertising
            cookies, so there is nothing to opt out of.
          </p>
        </section>

        <section>
          <h2 className="font-display italic text-xl text-ink mb-2">Your rights</h2>
          <p className="text-sm text-ink/85">
            You can download your data and permanently delete your account yourself from{" "}
            <Link href="/settings" className="text-ember font-semibold hover:underline">
              Settings
            </Link>
            . Deleting your account removes your profile, listings, conversations, ratings and saved items. Data is kept
            until you delete your account. You can also ask us to correct or restrict processing of your data
            {CONTACT_EMAIL ? (
              <>
                {" "}
                by emailing{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-ember font-semibold hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </>
            ) : null}
            .
          </p>
        </section>
      </div>
    </div>
  );
}
