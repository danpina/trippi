"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Moderation", match: (p: string) => p === "/admin" },
  { href: "/admin/listings", label: "Listings", match: (p: string) => p.startsWith("/admin/listings") },
  { href: "/admin/users", label: "Users", match: (p: string) => p.startsWith("/admin/users") },
];

export default function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin sections" className="flex gap-1.5 mb-8 border-b border-line">
      {TABS.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`px-4 py-2.5 text-sm font-semibold -mb-px border-b-2 ${
              active ? "border-ember text-ember" : "border-transparent text-slate hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
