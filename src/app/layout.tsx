import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

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

export const metadata: Metadata = {
  title: "TripSwap — spare bookings, spare weekends",
  description: "Find last-minute spare travel bookings, or offer one you can no longer use.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body className="min-h-screen flex flex-col bg-mist text-ink font-body">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-black/5 py-8 text-center text-xs text-slate">
          TripSwap — arrange payment privately with the other party. v1 prototype.
        </footer>
      </body>
    </html>
  );
}
