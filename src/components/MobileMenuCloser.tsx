"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// The mobile menu is a CSS-only checkbox toggle, which stays checked across client-side
// navigations; this unchecks it whenever the route changes.
export default function MobileMenuCloser() {
  const pathname = usePathname();
  useEffect(() => {
    const box = document.getElementById("nav-toggle") as HTMLInputElement | null;
    if (box) box.checked = false;
  }, [pathname]);
  return null;
}
