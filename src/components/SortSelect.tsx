"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { value: "", label: "Relevance" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "distance-asc", label: "Distance: nearest first" },
  { value: "distance-desc", label: "Distance: farthest first" },
  { value: "rating-desc", label: "Host rating: highest first" },
  { value: "rating-asc", label: "Host rating: lowest first" },
  { value: "date-asc", label: "Starts soonest" },
  { value: "date-desc", label: "Starts latest" },
];

export default function SortSelect({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <select
      defaultValue={defaultValue || ""}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("page");
        if (e.target.value) params.set("sort", e.target.value);
        else params.delete("sort");
        router.push(`/search?${params.toString()}`);
      }}
      className="input !w-auto text-sm py-1.5"
      aria-label="Sort results"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.value ? `Sort: ${o.label}` : o.label}
        </option>
      ))}
    </select>
  );
}
