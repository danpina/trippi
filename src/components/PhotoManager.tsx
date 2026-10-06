"use client";

import { useEffect, useRef, useState } from "react";

type ExistingPhoto = { id: string; url: string };

const MAX_PHOTOS = 10;
const MAX_EDGE = 1600;

// Decodes the file (which also proves it is a real image), applies EXIF rotation, and
// re-encodes it as a JPEG no larger than 1600px on its longest side. Phone photos are 3-12 MB;
// this brings them to a few hundred KB, comfortably inside the host's upload size limits
// and far faster to load in the grid. Returns null when the file can't be read as an image.
async function downscale(file: File): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) return null;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg" });
  } catch {
    return null;
  }
}

// Cover selection only — not full drag-reordering. "coverKey" is either an existing photo's
// id, or "new-N" for the Nth file in this submission's own file input (resolved to a real
// photo server-side, after upload).
export default function PhotoManager({
  existingPhotos = [],
  onBusyChange,
}: {
  existingPhotos?: ExistingPhoto[];
  onBusyChange?: (busy: boolean) => void;
}) {
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [cover, setCover] = useState("");
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const kept = existingPhotos.filter((p) => !removed.has(p.id));
  const items: { key: string; url: string }[] = [
    ...kept.map((p) => ({ key: p.id, url: p.url })),
    ...files.map((_, i) => ({ key: `new-${i}`, url: previews[i] || "" })),
  ].filter((it) => it.url);
  const effectiveCover = cover && items.some((it) => it.key === cover) ? cover : items[0]?.key || "";

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    onBusyChange?.(true);
    setNotice("");

    const processed: File[] = [];
    const unreadable: string[] = [];
    for (const f of picked) {
      const out = await downscale(f);
      if (out) processed.push(out);
      else unreadable.push(f.name);
    }

    const room = Math.max(0, MAX_PHOTOS - kept.length);
    const finalFiles = processed.slice(0, room);

    // Swap the input's own files for the processed ones, so the form submits those.
    const dt = new DataTransfer();
    finalFiles.forEach((f) => dt.items.add(f));
    if (inputRef.current) inputRef.current.files = dt.files;

    const messages: string[] = [];
    if (unreadable.length) messages.push(`Skipped (not a readable image): ${unreadable.join(", ")}.`);
    if (processed.length > finalFiles.length) messages.push(`A listing can have ${MAX_PHOTOS} photos at most — the extras were dropped.`);
    setNotice(messages.join(" "));
    setFiles(finalFiles);
    onBusyChange?.(false);
  }

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
              <img src={it.url} alt="Photo preview" className="w-full aspect-square object-cover" />
              {it.key === effectiveCover && (
                <span className="absolute top-1 left-1 tag !bg-ember !text-white text-[10px] px-1.5 py-0.5">Cover</span>
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
        ref={inputRef}
        type="file"
        name="photoFiles"
        multiple
        accept="image/*"
        onChange={onPick}
        className="input text-sm"
        aria-label="Choose photos"
      />
      {files.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setFiles([]);
            setNotice("");
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="text-xs text-slate hover:text-ink mt-1.5 underline"
        >
          Clear new selections
        </button>
      )}
      {notice && <p className="text-xs text-ember-deep font-semibold mt-1.5">{notice}</p>}
      <p className="text-xs text-slate mt-1.5">
        Up to {MAX_PHOTOS} photos, resized automatically. Pick which one is the cover — it&apos;s what shows first everywhere.
      </p>
    </div>
  );
}
