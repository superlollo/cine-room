import Link from "next/link";
import { posterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

const ROTATIONS = [
  "-rotate-6 -translate-x-9",
  "-rotate-2 -translate-x-3",
  "rotate-2 translate-x-3",
  "rotate-6 translate-x-9",
];

export function ListCard({
  id,
  name,
  emoji,
  count,
  posters,
}: {
  id: string;
  name: string;
  emoji: string;
  count: number;
  posters: string[];
}) {
  return (
    <Link
      href={`/lists/${id}`}
      className="group block rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition hover:bg-white/[0.07]"
    >
      <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-xl bg-surface-2">
        {posters.length === 0 ? (
          <span className="text-5xl opacity-60">{emoji}</span>
        ) : (
          posters.slice(0, 4).map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={posterUrl(p, "w185") ?? undefined}
              alt=""
              style={{ zIndex: i }}
              className={cn(
                "absolute h-28 w-[4.7rem] rounded-md object-cover shadow-lg ring-1 ring-black/40 transition-transform duration-300 group-hover:scale-105",
                ROTATIONS[i],
              )}
            />
          ))
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xl">{emoji}</span>
        <div className="min-w-0">
          <p className="truncate font-medium">{name}</p>
          <p className="text-xs text-muted">{count} film</p>
        </div>
      </div>
    </Link>
  );
}
