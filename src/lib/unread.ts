import { db } from "./db";

type ThreadForUnread = {
  initiatorId: string;
  initiatorReadAt: Date | null;
  ownerReadAt: Date | null;
  messages: { senderId: string; createdAt: Date }[];
};

// A thread is unread for `userId` when its newest message is from the other person and
// arrived after the last time this user opened the thread.
export function isThreadUnread(t: ThreadForUnread, userId: string) {
  const last = t.messages[0];
  if (!last || last.senderId === userId) return false;
  const readAt = t.initiatorId === userId ? t.initiatorReadAt : t.ownerReadAt;
  return !readAt || last.createdAt > readAt;
}

export async function countUnreadThreads(userId: string) {
  const threads = await db.thread.findMany({
    where: { OR: [{ initiatorId: userId }, { ownerId: userId }] },
    select: {
      initiatorId: true,
      initiatorReadAt: true,
      ownerReadAt: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { senderId: true, createdAt: true } },
    },
  });
  return threads.filter((t) => isThreadUnread(t, userId)).length;
}
