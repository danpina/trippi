import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["opsz", "SOFT", "WONK"],
  style: ["normal", "italic"],
  weight: "variable",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"],
});

const DESCRIPTION = "Find last-minute spare travel bookings, or offer one you can no longer use.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "TripSwap — spare bookings, spare weekends", template: "%s — TripSwap" },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "TripSwap",
    title: "TripSwap — spare bookings, spare weekends",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = { themeColor: "#F4F7F1" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body className="min-h-screen flex flex-col bg-mist text-ink font-body">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-black/5 mt-10 py-10 px-6 text-sm text-slate">
          <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-8">
            <div>
              <p className="font-display italic text-ink text-base mb-1.5">TripSwap</p>
              <p className="text-xs leading-relaxed">
                Someone&apos;s cancelled trip is your open weekend. We connect people with a spare travel booking to
                people looking for a last-minute plan — nothing more. v1 prototype.
              </p>
            </div>
            <div>
              <p className="eyebrow text-ink mb-1.5">Site</p>
              <ul className="text-xs [&_a]:inline-block [&_a]:py-1.5">
                <li>
                  <Link href="/safety" className="hover:text-ink hover:underline">
                    Safety tips
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-ink hover:underline">
                    Terms &amp; disclaimer
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-ink hover:underline">
                    Privacy policy
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="eyebrow text-ink mb-1.5">Contact</p>
              <p className="text-xs">
                {CONTACT_EMAIL ? (
                  <>
                    Questions, feedback, or a listing to report?{" "}
                    <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-ink hover:underline">
                      {CONTACT_EMAIL}
                    </a>
                  </>
                ) : (
                  "See something wrong? Use the Report link on any listing or conversation."
                )}
              </p>
            </div>
          </div>
          <p className="max-w-5xl mx-auto mt-8 text-[11px] text-slate">
            TripSwap only connects users — arrange payment privately and see our{" "}
            <Link href="/terms" className="underline hover:text-ink">
              terms &amp; disclaimer
            </Link>{" "}
            for the full disclaimer.
          </p>
        </footer>
      </body>
    </html>
  );
}
