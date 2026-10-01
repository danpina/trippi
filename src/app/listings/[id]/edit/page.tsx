import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { updateListingAction } from "@/app/actions";
import ListingForm from "@/components/ListingForm";

function toDateInput(d: Date) {
  return new Date(d).toISOString().slice(0, 10);
}

export default async function EditListingPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/listings/${params.id}/edit`);

  const listing = await db.listing.findUnique({
    where: { id: params.id },
    include: { photos: { orderBy: { sortOrder: "asc" } } },
  });
  if (!listing) notFound();
  if (listing.ownerId !== user.id && !user.isAdmin) notFound();

  const categories = await db.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
    include: { children: { orderBy: { name: "asc" } } },
  });

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <p className="eyebrow text-ember">Edit listing</p>
      <h1 className="font-display text-3xl font-medium text-ink mt-1 mb-2">{listing.title}</h1>
      <p className="text-slate text-sm mb-8 max-w-lg">
        Changes run back through the same moderation check as a new listing — a fix can clear a flag, and an
        edit can just as easily introduce one.
      </p>

      <ListingForm
        action={updateListingAction}
        categories={categories}
        submitLabel="Save changes"
        listingId={listing.id}
        defaults={{
          listingType: listing.listingType,
          categoryId: listing.categoryId,
          title: listing.title,
          description: listing.description,
          location: listing.location,
          addressDetails: listing.addressDetails || "",
          lat: listing.lat,
          lng: listing.lng,
          dateStart: toDateInput(listing.dateStart),
          dateEnd: toDateInput(listing.dateEnd),
          price: listing.price,
          priceNegotiable: listing.priceNegotiable,
          capacity: listing.capacity,
          minAge: listing.minAge,
          maxAge: listing.maxAge,
          genderPreference: listing.genderPreference,
          photoUrls: listing.photos.map((p) => p.url).join("\n"),
        }}
      />
    </div>
  );
}
