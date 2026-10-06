"use client";

import { useState } from "react";

// Mobile date pickers (especially iOS) offer no way to empty a date once it's set, so this adds
// an explicit clear button. Still a plain named input, so it submits with the surrounding form.
export default function ClearableDate({
  name,
  defaultValue,
  label,
}: {
  name: string;
  defaultValue?: string;
  label: string;
}) {
  const [value, setValue] = useState(defaultValue || "");

  return (
    <div className="relative">
      <input
        type="date"
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={`input ${value ? "pr-16" : ""}`}
        aria-label={label}
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label={`Clear ${label.toLowerCase()}`}
          className="absolute right-8 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full text-slate hover:text-ink hover:bg-mist text-lg leading-none"
        >
          ×
        </button>
      )}
    </div>
  );
}
