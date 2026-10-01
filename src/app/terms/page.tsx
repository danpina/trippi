export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <p className="eyebrow text-ember">Legal</p>
      <h1 className="font-display text-3xl font-medium text-ink mt-1 mb-2">Terms &amp; disclaimer</h1>
      <p className="text-slate text-sm mb-10 max-w-lg">
        This is a placeholder policy covering TripSwap&apos;s core position while it&apos;s in early access — it
        will be replaced by a lawyer-drafted version before any real money or liability is on the line. Until
        then, this is what governs using the site.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="font-display italic text-xl text-ink mb-2">What TripSwap is</h2>
          <p className="text-sm text-ink/85">
            TripSwap is a listings and messaging platform that connects people with a spare travel booking to
            people looking for one. We are not a party to any booking, trip, or payment arranged between users,
            we do not hold, transfer, or guarantee any money, and we do not verify that a listing, a booking, or
            a person&apos;s identity is genuine.
          </p>
        </section>

        <section>
          <h2 className="font-display italic text-xl text-ink mb-2">No responsibility for what happens</h2>
          <p className="text-sm text-ink/85">
            Everything arranged between users — payment, meeting up, traveling together, the condition and
            validity of a booking — is entirely between them. TripSwap takes no responsibility for any loss,
            damage, injury, dispute, fraud, or other outcome arising from a listing, a conversation, or an
            arrangement made through the site, to the fullest extent the law allows. Use of the site is at your
            own risk.
          </p>
        </section>

        <section>
          <h2 className="font-display italic text-xl text-ink mb-2">No warranty</h2>
          <p className="text-sm text-ink/85">
            The site is provided &quot;as is,&quot; without any warranty of accuracy, availability, or fitness
            for a particular purpose. Listing content is created by users; moderation is automated and partly
            human-reviewed, but it doesn&apos;t guarantee that a listing is accurate, safe, or legitimate.
          </p>
        </section>

        <section>
          <h2 className="font-display italic text-xl text-ink mb-2">Your responsibility</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-ink/85">
            <li>Verify who you&apos;re dealing with and the booking details before paying or committing anything.</li>
            <li>Arrange and secure payment yourself — see our <a href="/safety" className="text-ember font-semibold hover:underline">safety tips</a> for how to do that more safely.</li>
            <li>Follow local laws and the terms of the original booking provider (airline, hotel, tour operator, etc.) when transferring or using it.</li>
            <li>Be at least 18, or have a guardian&apos;s involvement where that applies, to use the site.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display italic text-xl text-ink mb-2">Changes</h2>
          <p className="text-sm text-ink/85">
            This page may change as the product and its real legal terms develop. Continuing to use TripSwap
            after a change means you accept the current version.
          </p>
        </section>

        <section>
          <h2 className="font-display italic text-xl text-ink mb-2">Contact</h2>
          <p className="text-sm text-ink/85">
            Questions about these terms:{" "}
            <a href="mailto:hello@tripswap.dev" className="text-ember font-semibold hover:underline">
              hello@tripswap.dev
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
