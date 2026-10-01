import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createListingAction } from "@/app/actions";
import ListingForm from "@/components/ListingForm";

export default async function NewListingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/listings/new");

  const categories = await db.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
    include: { children: { orderBy: { name: "asc" } } },
  });

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <p className="eyebrow text-ember">New listing</p>
      <h1 className="font-display text-3xl font-medium text-ink mt-1 mb-2">Post a listing</h1>
      <p className="text-slate text-sm mb-8 max-w-lg">
        Every listing runs through a rule-based check before it goes public. Most listings publish instantly;
        anything the rules flag goes to a human moderator instead of being rejected outright.
      </p>

      <ListingForm action={createListingAction} categories={categories} submitLabel="Publish listing" />
    </div>
  );
}
