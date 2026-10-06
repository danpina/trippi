// Explicit, locale-independent formats: server-side toLocaleDateString() used the server's
// default locale (US on Vercel, so "10/18/2026"), and "10/11/2026" is ambiguous anyway.
const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

// Listing dates are stored as UTC midnight (the date inputs are plain calendar days).
export function formatDate(d: Date | string) {
  return DATE.format(new Date(d));
}

export function formatDateRange(a: Date | string, b: Date | string) {
  return `${formatDate(a)} – ${formatDate(b)}`;
}

export function formatDateTime(d: Date | string) {
  return `${DATE_TIME.format(new Date(d))} UTC`;
}

export function formatPrice(price: number | null | undefined, currency = "EUR") {
  if (!price) return "Free";
  const whole = Number.isInteger(price);
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(price);
}
