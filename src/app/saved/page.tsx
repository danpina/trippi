import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import ListingCard from "@/components/ListingCard";

export default async function SavedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/saved");

  const saved = await db.savedListing.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        include: { category: { include: { parent: true } }, owner: true, photos: { take: 1 } },
      },
    },
  });

  const listings = saved.filter((s) => s.listing.moderationStatus === "published").map((s) => s.listing);

  return (
    <div className="max-w-6xl mx-auto px-6 py-14">
      <h1 className="font-display italic text-3xl text-ink mb-8">Saved listings</h1>

      {listings.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-slate text-sm">
            Nothing saved yet. Tap the heart on any listing to keep it here —{" "}
            <Link href="/search" className="text-ember font-semibold hover:underline">
              start browsing
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} saved={true} showSave={true} savePath="/saved" />
          ))}
        </div>
      )}
    </div>
  );
}
