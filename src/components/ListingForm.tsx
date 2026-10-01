import LocationPicker from "./LocationPicker";

type CategoryOption = {
  id: string;
  name: string;
  children: { id: string; name: string }[];
};

export type ListingFormDefaults = {
  listingType: string;
  categoryId: string;
  title: string;
  description: string;
  location: string;
  addressDetails: string;
  lat: number | null;
  lng: number | null;
  dateStart: string;
  dateEnd: string;
  price: number | null;
  priceNegotiable: boolean;
  capacity: number;
  minAge: number | null;
  maxAge: number | null;
  genderPreference: string;
  photoUrls: string;
};

const emptyDefaults: ListingFormDefaults = {
  listingType: "opportunity",
  categoryId: "",
  title: "",
  description: "",
  location: "",
  addressDetails: "",
  lat: null,
  lng: null,
  dateStart: "",
  dateEnd: "",
  price: null,
  priceNegotiable: false,
  capacity: 1,
  minAge: null,
  maxAge: null,
  genderPreference: "any",
  photoUrls: "",
};

export default function ListingForm({
  action,
  categories,
  defaults,
  submitLabel,
  listingId,
}: {
  action: (formData: FormData) => void;
  categories: CategoryOption[];
  defaults?: Partial<ListingFormDefaults>;
  submitLabel: string;
  listingId?: string;
}) {
  const d = { ...emptyDefaults, ...defaults };

  return (
    <form action={action} className="card p-7 space-y-5">
      {listingId && <input type="hidden" name="listingId" value={listingId} />}

      <div>
        <label className="eyebrow text-slate">Listing type</label>
        <select name="listingType" defaultValue={d.listingType} className="input mt-1.5">
          <option value="opportunity">Opportunity — a real booking with a fixed price</option>
          <option value="plan">Plan — a looser "join us" post, no fixed price</option>
        </select>
      </div>

      <div>
        <label className="eyebrow text-slate">Activity</label>
        <select name="categoryId" required defaultValue={d.categoryId} className="input mt-1.5">
          {!d.categoryId && <option value="">Select an activity…</option>}
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
        <input
          name="title"
          required
          minLength={8}
          defaultValue={d.title}
          placeholder="Spare week in a Chamonix chalet"
          className="input mt-1.5"
        />
      </div>

      <div>
        <label className="eyebrow text-slate">Description</label>
        <textarea
          name="description"
          required
          minLength={30}
          rows={5}
          defaultValue={d.description}
          className="input mt-1.5"
          placeholder="What's included, why it's spare, anything a buyer should know…"
        />
      </div>

      <div>
        <label className="eyebrow text-slate">Location</label>
        <div className="mt-1.5">
          <LocationPicker
            labelFieldName="location"
            defaultLabel={d.location}
            defaultLat={d.lat != null ? String(d.lat) : undefined}
            defaultLng={d.lng != null ? String(d.lng) : undefined}
            placeholder="Chamonix, France"
          />
        </div>
        <p className="text-xs text-slate mt-1.5">Pick a suggestion so this shows up on the map — or just type a place name.</p>
      </div>

      <div>
        <label className="eyebrow text-slate">Address details (optional)</label>
        <input
          name="addressDetails"
          defaultValue={d.addressDetails}
          placeholder="Street, building, meeting point…"
          className="input mt-1.5"
        />
        <p className="text-xs text-slate mt-1.5">Only shown on the listing — not used for search or the map.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="eyebrow text-slate">Start date</label>
          <input type="date" name="dateStart" required defaultValue={d.dateStart} className="input mt-1.5" />
        </div>
        <div>
          <label className="eyebrow text-slate">End date</label>
          <input type="date" name="dateEnd" required defaultValue={d.dateEnd} className="input mt-1.5" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="eyebrow text-slate">Price (€, blank = free)</label>
          <input type="number" step="any" name="price" defaultValue={d.price ?? ""} className="input mt-1.5" />
        </div>
        <div>
          <label className="eyebrow text-slate">Capacity</label>
          <input type="number" name="capacity" defaultValue={d.capacity} min={1} className="input mt-1.5" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink/85 -mt-2">
        <input type="checkbox" name="priceNegotiable" defaultChecked={d.priceNegotiable} className="accent-ember" />
        Price is negotiable
      </label>

      <fieldset className="border border-line rounded-xl p-4">
        <legend className="eyebrow text-slate px-1">Filtering preferences (optional, never a requirement to contact)</legend>
        <div className="grid grid-cols-3 gap-3 mt-1">
          <input type="number" name="minAge" defaultValue={d.minAge ?? ""} placeholder="Min age" className="input" />
          <input type="number" name="maxAge" defaultValue={d.maxAge ?? ""} placeholder="Max age" className="input" />
          <select name="genderPreference" defaultValue={d.genderPreference} className="input">
            <option value="any">Any</option>
            <option value="women">Women</option>
            <option value="men">Men</option>
          </select>
        </div>
      </fieldset>

      <div>
        <label className="eyebrow text-slate">Photo URLs (one per line, optional)</label>
        <textarea name="photoUrls" rows={2} defaultValue={d.photoUrls} className="input mt-1.5" placeholder="https://…" />
      </div>

      <button className="btn-primary w-full">{submitLabel}</button>
    </form>
  );
}
