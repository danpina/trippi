export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://trippi-pi.vercel.app").replace(/\/$/, "");

// Set NEXT_PUBLIC_CONTACT_EMAIL in the environment once there is a real, monitored mailbox.
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";
