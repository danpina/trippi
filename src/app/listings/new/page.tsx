import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createListingAction } from "@/app/actions";

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

      <form action={createListingAction} className="card p-7 space-y-5">
        <div>
          <label className="eyebrow text-slate">Listing type</label>
          <select name="listingType" className="input mt-1.5">
            <option value="opportunity">Opportunity — a real booking with a fixed price</option>
            <option value="plan">Plan — a looser "join us" post, no fixed price</option>
          </select>
        </div>

        <div>
          <label className="eyebrow text-slate">Activity</label>
          <select name="categoryId" required className="input mt-1.5">
            {categories.map((top) => (
              <optgroup key={top.id} label={top.name}>
                <option value={top.id}>{top.name} (general)</option>
                {top.children.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {top.name} — {sub.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label className="eyebrow text-slate">Title</label>
          <input name="title" required minLength={8} placeholder="Spare week in a Chamonix chalet" className="input mt-1.5" />
        </div>

        <div>
          <label className="eyebrow text-slate">Description</label>
          <textarea
            name="description"
            required
            minLength={30}
            rows={5}
            className="input mt-1.5"
            placeholder="What's included, why it's spare, anything a buyer should know…"
          />
        </div>

        <div>
          <label className="eyebrow text-slate">Location</label>
          <input name="location" required placeholder="Chamonix, France" className="input mt-1.5" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input type="number" step="any" name="lat" placeholder="Latitude (optional)" className="input" />
          <input type="number" step="any" name="lng" placeholder="Longitude (optional)" className="input" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="eyebrow text-slate">Start date</label>
            <input type="date" name="dateStart" required className="input mt-1.5" />
          </div>
          <div>
            <label className="eyebrow text-slate">End date</label>
            <input type="date" name="dateEnd" required className="input mt-1.5" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="eyebrow text-slate">Price (€, blank = free)</label>
            <input type="number" step="any" name="price" className="input mt-1.5" />
          </div>
          <div>
            <label className="eyebrow text-slate">Capacity</label>
            <input type="number" name="capacity" defaultValue={1} min={1} className="input mt-1.5" />
          </div>
        </div>

        <fieldset className="border border-line rounded-xl p-4">
          <legend className="eyebrow text-slate px-1">Filtering preferences (optional, never a requirement to contact)</legend>
          <div className="grid grid-cols-3 gap-3 mt-1">
            <input type="number" name="minAge" placeholder="Min age" className="input" />
            <input type="number" name="maxAge" placeholder="Max age" className="input" />
            <select name="genderPreference" className="input">
              <option value="any">Any</option>
              <option value="women">Women</option>
              <option value="men">Men</option>
            </select>
          </div>
        </fieldset>

        <div>
          <label className="eyebrow text-slate">Photo URLs (one per line, optional)</label>
          <textarea name="photoUrls" rows={2} className="input mt-1.5" placeholder="https://…" />
        </div>

        <button className="btn-primary w-full">Publish listing</button>
      </form>
    </div>
  );
}
