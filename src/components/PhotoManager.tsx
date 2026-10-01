"use client";

import { useRef, useState } from "react";

type ExistingPhoto = { id: string; url: string };

// Cover selection only — not full drag-reordering. "coverKey" is either an existing photo's
// id, or "new-N" for the Nth file in this submission's own file input (resolved to a real
// ListingPhoto id server-side, after upload). Removing a newly-picked file isn't supported
// here; clearing resets the whole file input, which covers that case well enough for v1.
export default function PhotoManager({ existingPhotos = [] }: { existingPhotos?: ExistingPhoto[] }) {
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const kept = existingPhotos.filter((p) => !removed.has(p.id));
  const items: { key: string; url: string }[] = [
    ...kept.map((p) => ({ key: p.id, url: p.url })),
    ...files.map((f, i) => ({ key: `new-${i}`, url: URL.createObjectURL(f) })),
  ];
  const [cover, setCover] = useState<string>("");
  const effectiveCover = cover && items.some((it) => it.key === cover) ? cover : items[0]?.key || "";

  return (
    <div>
      <input type="hidden" name="coverKey" value={effectiveCover} />
      {[...removed].map((id) => (
        <input key={id} type="hidden" name="removePhotoIds" value={id} />
      ))}

      {items.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
          {items.map((it) => (
            <div
              key={it.key}
              className={`relative rounded-lg overflow-hidden border-2 ${
                it.key === effectiveCover ? "border-ember" : "border-line"
              }`}
            >
              <img src={it.url} alt="" className="w-full aspect-square object-cover" />
              {it.key === effectiveCover && (
                <span className="absolute top-1 left-1 tag !bg-ember !text-white text-[10px] px-1.5 py-0.5">
                  Cover
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex gap-1 p-1 bg-gradient-to-t from-black/60 to-transparent">
                {it.key !== effectiveCover && (
                  <button
                    type="button"
                    onClick={() => setCover(it.key)}
                    className="flex-1 text-[11px] font-semibold text-white bg-black/40 rounded px-1 py-0.5 hover:bg-black/60"
                  >
                    Make cover
                  </button>
                )}
                {!it.key.startsWith("new-") && (
                  <button
                    type="button"
                    onClick={() => setRemoved((r) => new Set([...r, it.key]))}
                    className="flex-1 text-[11px] font-semibold text-white bg-black/40 rounded px-1 py-0.5 hover:bg-black/60"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        name="photoFiles"
        multiple
        accept="image/*"
        onChange={(e) => setFiles(Array.from(e.target.files || []))}
        className="input text-sm"
      />
      {files.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setFiles([]);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
          className="text-xs text-slate hover:text-ink mt-1.5 underline"
        >
          Clear new selections
        </button>
      )}
      <p className="text-xs text-slate mt-1.5">Click a photo to make it the cover — it's what shows first everywhere.</p>
    </div>
  );
}
