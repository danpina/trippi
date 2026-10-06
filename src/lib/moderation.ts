// v1 moderation: fast, free, rule-based checks that run before a listing goes live.
// A failed check flags the listing for human review rather than hard-rejecting it —
// rules are blunt, and a false rejection loses a host. See the product sketch's
// moderation section for the planned AI-assisted pass that layers on top of this later.

const BANNED_TERMS = [
  "viagra",
  "crypto investment",
  "wire transfer only",
  "whatsapp me at",
  "guaranteed returns",
];

const DATE_LIKE = /\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b/g;
const LINK = /(https?:\/\/)|(\bwww\.)/i;

// Dates ("15-12-2026"), booking references and flight numbers are long digit runs too, so
// strip date-like text first and only treat 9+ digits (8+ with a leading +) as a phone number.
export function looksLikePhoneOrLink(text: string): boolean {
  if (LINK.test(text)) return true;
  const stripped = text.replace(DATE_LIKE, " ");
  for (const m of stripped.matchAll(/\+?\d[\d\s().-]{6,}\d/g)) {
    const digits = m[0].replace(/\D/g, "").length;
    if (m[0].startsWith("+") ? digits >= 8 : digits >= 9) return true;
  }
  return false;
}

export type ModerationInput = {
  title: string;
  description: string;
  price?: number | null;
  dateStart: Date;
  dateEnd: Date;
  category: string;
};

export type ModerationResult = {
  status: "published" | "flagged";
  notes: string[];
};

export function runModerationRules(input: ModerationInput): ModerationResult {
  const notes: string[] = [];
  const text = `${input.title} ${input.description}`.toLowerCase();

  for (const term of BANNED_TERMS) {
    if (text.includes(term)) notes.push(`Banned term detected: "${term}"`);
  }

  if (looksLikePhoneOrLink(input.title) || looksLikePhoneOrLink(input.description)) {
    notes.push("Contains a phone number or external link — possible attempt to route around the platform.");
  }

  if (input.description.trim().length < 30) {
    notes.push("Description is too short to be reviewable (under 30 characters).");
  }

  if (input.title.trim().length < 8) {
    notes.push("Title is too short.");
  }

  const now = Date.now();
  if (input.dateEnd.getTime() < now - 86400000) {
    notes.push("Date range is entirely in the past.");
  }
  if (input.dateStart.getTime() > now + 1000 * 60 * 60 * 24 * 365 * 2) {
    notes.push("Start date is more than two years out — check for a typo.");
  }
  if (input.dateEnd.getTime() < input.dateStart.getTime()) {
    notes.push("End date is before the start date.");
  }

  if (input.price != null) {
    if (input.price < 0) notes.push("Price is negative.");
    if (input.price > 50000) notes.push("Price is implausibly high — check for a typo.");
  }

  return {
    status: notes.length === 0 ? "published" : "flagged",
    notes,
  };
}
