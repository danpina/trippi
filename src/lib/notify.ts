import { sendEmail } from "./email";
import { SITE_URL } from "./site";

// Best-effort: a failed or unconfigured email never blocks the action that triggered it.
export async function notifyNewMessage(opts: {
  to: string;
  toName: string;
  fromName: string;
  listingTitle: string;
  threadId: string;
  preview: string;
}) {
  const preview = opts.preview.length > 240 ? `${opts.preview.slice(0, 240)}…` : opts.preview;
  await sendEmail(
    opts.to,
    `New message from ${opts.fromName} about "${opts.listingTitle}"`,
    `Hi ${opts.toName},\n\n${opts.fromName} wrote about "${opts.listingTitle}":\n\n"${preview}"\n\nReply here: ${SITE_URL}/messages/${opts.threadId}\n\n— TripSwap`
  );
}
