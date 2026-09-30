import { toggleSaveAction } from "@/app/actions";

export default function SaveButton({
  listingId,
  saved,
  path,
  className = "",
}: {
  listingId: string;
  saved: boolean;
  path: string;
  className?: string;
}) {
  return (
    <form action={toggleSaveAction} className={className}>
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="path" value={path} />
      <button
        type="submit"
        aria-label={saved ? "Remove from saved" : "Save this listing"}
        title={saved ? "Remove from saved" : "Save this listing"}
        className="w-8 h-8 rounded-full bg-ink/45 backdrop-blur-sm flex items-center justify-center hover:bg-ink/65 transition-colors"
      >
        <svg
          viewBox="0 0 24 24"
          className={saved ? "w-4 h-4 fill-ember stroke-ember" : "w-4 h-4 fill-none stroke-white"}
          strokeWidth="2"
        >
          <path
            d="M12 21s-7.5-4.6-10-9.1C.5 8.6 2 5 5.5 5c2 0 3.5 1.2 4.5 2.7C11 6.2 12.5 5 14.5 5 18 5 19.5 8.6 18 11.9 15.5 16.4 12 21 12 21z"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </form>
  );
}
