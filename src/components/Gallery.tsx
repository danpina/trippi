"use client";

import { useCallback, useEffect, useState } from "react";

type Photo = { id: string; url: string };

// Cover on the left, up to four more on the right, and a lightbox that reaches every photo
// (the old hero only ever showed the first three).
export default function Gallery({ photos, title }: { photos: Photo[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const count = photos.length;

  const step = useCallback(
    (dir: number) => setOpen((i) => (i === null ? i : (i + dir + count) % count)),
    [count]
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, step]);

  const side = photos.slice(1, 5);

  return (
    <>
      <div className={count === 1 ? "" : "grid grid-cols-1 sm:grid-cols-2 gap-1"}>
        <button
          type="button"
          onClick={() => setOpen(0)}
          className="block w-full h-64 sm:h-[26rem] overflow-hidden"
          aria-label={`Open photo 1 of ${count}`}
        >
          <img src={photos[0].url} alt={`${title} — photo 1`} className="w-full h-full object-cover" />
        </button>
        {count > 1 && (
          <div
            className={`hidden sm:grid gap-1 h-[26rem] ${
              side.length <= 2 ? "grid-cols-1" : "grid-cols-2"
            } ${side.length === 1 ? "grid-rows-1" : "grid-rows-2"}`}
          >
            {side.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setOpen(i + 1)}
                className={`relative overflow-hidden ${side.length === 3 && i === 2 ? "col-span-2" : ""}`}
                aria-label={`Open photo ${i + 2} of ${count}`}
              >
                <img src={p.url} alt={`${title} — photo ${i + 2}`} loading="lazy" className="w-full h-full object-cover" />
                {i === side.length - 1 && count > 5 && (
                  <span className="absolute inset-0 bg-ink/55 text-white font-bold flex items-center justify-center">
                    +{count - 5} more
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      {count > 1 && (
        <button
          type="button"
          onClick={() => setOpen(0)}
          className="sm:hidden text-xs font-semibold text-slate underline px-6 pt-2"
        >
          View all {count} photos
        </button>
      )}

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} photos`}
          className="fixed inset-0 z-50 bg-ink/95 flex items-center justify-center"
          onClick={() => setOpen(null)}
        >
          <img
            src={photos[open].url}
            alt={`${title} — photo ${open + 1}`}
            className="max-w-[94vw] max-h-[86vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="absolute top-4 right-4 text-white text-3xl leading-none px-3 py-1"
            aria-label="Close"
          >
            ×
          </button>
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white text-4xl px-3"
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white text-4xl px-3"
                aria-label="Next photo"
              >
                ›
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
                {open + 1} / {count}
              </span>
            </>
          )}
        </div>
      )}
    </>
  );
}
