const PATHS: Record<string, string> = {
  ski: "M3 20l6-11 3 5 2-3 7 9M9 9l3-6 3 6",
  hike: "M4 20l5-13 3 6 2-3 6 10M13 8a2 2 0 100-4 2 2 0 000 4z",
  run: "M13 4a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM7 20l3-5-2-3 3-3 2 3 4-1M8 12l3-2 3 4",
  golf: "M7 21V4l9 3.5L7 11M4 21h10",
  bike: "M6 18a3 3 0 100-6 3 3 0 000 6zM18 18a3 3 0 100-6 3 3 0 000 6zM9 16l3-8h4l2 3M9 8h3l2 4",
  wave: "M2 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 11c2-2 4-2 6 0s4 2 6 0 4-2 6 0",
  climb: "M3 20l6-13 3 6 2-3 7 10M15 6a2 2 0 100-4 2 2 0 000 4z",
  leaf: "M5 20c9 0 14-5 14-15C9 5 5 10 5 20zM6 19c3-4 7-7 11-9",
  city: "M4 21V9l5-4v16M9 21V5l6 3v13M15 21v-9l5 3v6M4 21h16",
  van: "M3 17V9h9l3 4h5v4M3 17a2 2 0 104 0 2 2 0 00-4 0zM14 17a2 2 0 104 0 2 2 0 00-4 0zM3 13h13",
  compass: "M12 21a9 9 0 100-18 9 9 0 000 18zM14.5 9.5l-2 5-3-1.5 2-5z",
};

export default function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const d = PATHS[name] || PATHS.compass;
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
