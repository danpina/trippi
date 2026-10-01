import CategoryIcon from "./CategoryIcon";
import { styleFor, styleForSeeded } from "@/lib/categoryStyle";

export default function CategoryArt({
  topSlug,
  seed,
  className = "",
}: {
  topSlug: string | undefined | null;
  seed?: string;
  className?: string;
}) {
  const s = seed ? styleForSeeded(topSlug, seed) : styleFor(topSlug);
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}
    >
      <div
        className="absolute -right-6 -bottom-8 w-32 h-32 rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, white, transparent 70%)" }}
      />
      <CategoryIcon name={s.icon} className="w-10 h-10 text-white/90 relative" />
    </div>
  );
}
