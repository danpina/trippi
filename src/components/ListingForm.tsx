"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import LocationPicker from "./LocationPicker";
import PhotoManager from "./PhotoManager";
import type { ListingState } from "@/app/actions";

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
  existingPhotos,
  needsTerms,
}: {
  action: (prev: ListingState, formData: FormData) => Promise<ListingState>;
  categories: CategoryOption[];
  defaults?: Partial<ListingFormDefaults>;
  submitLabel: string;
  listingId?: string;
  existingPhotos?: { id: string; url: string }[];
  needsTerms: boolean;
}) {
  const d = { ...emptyDefaults, ...defaults };
  const [state, formAction, pending] = useActionState(action, undefined);
  const [photosBusy, setPhotosBusy] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state?.error) errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [state]);

  return (
    <form
      // Submitting through onSubmit (not the `action` prop) keeps React from resetting the
      // form after a validation error, so nothing the user typed or picked is lost.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="card p-5 sm:p-7 space-y-5"
    >
      {listingId && <input type="hidden" name="listingId" value={listingId} />}

      <div>
        <label className="eyebrow text-slate">Listing type</label>
        <select name="listingType" defaultValue={d.listingType} className="input mt-1.5">
          <option value="opportunity">Opportunity — a real booking with a fixed price</option>
          <option value="plan">Plan — a looser &quot;join us&quot; post, no fixed price</option>
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
          maxLength={120}
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
          maxLength={4000}
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
            required
          />
        </div>
        <p className="text-xs text-slate mt-1.5">
          Pick a suggestion for the most accurate map pin — if you just type a place name, we&apos;ll look it up for you.
        </p>
      </div>

      <div>
        <label className="eyebrow text-slate">Address details (optional)</label>
        <input
          name="addressDetails"
          maxLength={200}
          defaultValue={d.addressDetails}
          placeholder="Street, building, meeting point…"
          className="input mt-1.5"
        />
        <p className="text-xs text-slate mt-1.5">Only shown on the listing — not used for search or the map.</p>
      </div>

      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
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
          <label className="eyebrow text-slate">Price (€)</label>
          <input
            type="number"
            step="any"
            min={0}
            max={50000}
            name="price"
            defaultValue={d.price ?? ""}
            placeholder="Blank = free"
            className="input mt-1.5"
          />
        </div>
        <div>
          <label className="eyebrow text-slate">Capacity</label>
          <input type="number" name="capacity" defaultValue={d.capacity} min={1} max={100} className="input mt-1.5" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink/85 -mt-2">
        <input type="checkbox" name="priceNegotiable" defaultChecked={d.priceNegotiable} className="accent-ember h-4 w-4" />
        Price is negotiable
      </label>

      <fieldset className="border border-line rounded-xl p-4">
        <legend className="eyebrow text-slate px-1">Filtering preferences (optional)</legend>
        <p className="text-xs text-slate mb-2">Never a requirement to contact you.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
          <input type="number" name="minAge" min={13} max={120} defaultValue={d.minAge ?? ""} placeholder="Min age" className="input" aria-label="Minimum age" />
          <input type="number" name="maxAge" min={13} max={120} defaultValue={d.maxAge ?? ""} placeholder="Max age" className="input" aria-label="Maximum age" />
          <select name="genderPreference" defaultValue={d.genderPreference} className="input col-span-2 sm:col-span-1" aria-label="Gender preference">
            <option value="any">Any</option>
            <option value="women">Women</option>
            <option value="men">Men</option>
          </select>
        </div>
      </fieldset>

      <div>
        <label className="eyebrow text-slate">Photos (optional)</label>
        <div className="mt-1.5">
          <PhotoManager existingPhotos={existingPhotos} onBusyChange={setPhotosBusy} />
        </div>
        <details className="mt-3">
          <summary className="text-xs text-slate cursor-pointer hover:text-ink">Advanced: paste image URLs instead</summary>
          <textarea name="photoUrls" rows={2} defaultValue={d.photoUrls} className="input mt-1.5" placeholder="https://…" />
          <p className="text-xs text-slate mt-1.5">
            Most links to photos hosted elsewhere (Google Photos, Instagram, etc.) won&apos;t actually load here — they
            block hotlinking. A direct image URL (ending in .jpg/.png, from somewhere like Imgur) works fine.
          </p>
        </details>
      </div>

      {needsTerms ? (
        <label className="flex items-start gap-2 text-sm text-ink/85">
          <input type="checkbox" name="acceptTerms" required className="accent-ember mt-0.5 h-4 w-4 shrink-0" />
          <span>
            I agree to the{" "}
            <a href="/terms" target="_blank" className="text-ember font-semibold hover:underline">
              Terms &amp; disclaimer
            </a>{" "}
            — TripSwap only connects people and takes no responsibility for what&apos;s arranged between them.
          </span>
        </label>
      ) : (
        <p className="text-xs text-slate">
          TripSwap only connects people and takes no responsibility for what&apos;s arranged between them — see the{" "}
          <a href="/terms" target="_blank" className="text-ember font-semibold hover:underline">
            Terms &amp; disclaimer
          </a>
          .
        </p>
      )}

      {state?.error && (
        <div ref={errorRef} role="alert" className="rounded-xl bg-ember-soft border border-ember/30 px-4 py-3 text-sm text-ember-deep font-semibold">
          {state.error}
        </div>
      )}

      <button className="btn-primary w-full" disabled={pending || photosBusy}>
        {pending ? "Saving…" : photosBusy ? "Preparing photos…" : submitLabel}
      </button>
    </form>
  );
}
