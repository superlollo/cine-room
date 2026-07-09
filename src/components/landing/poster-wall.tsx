import { posterUrl } from "@/lib/tmdb";

// Parete di poster in scorrimento lento dietro la hero. Puramente decorativa.
export function PosterWall({ posters }: { posters: string[] }) {
  if (posters.length === 0) return null;

  const cols = 4;
  const columns = Array.from({ length: cols }, (_, c) =>
    posters.filter((_, i) => i % cols === c),
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-20 flex justify-center gap-3 overflow-hidden opacity-[0.12]"
    >
      {columns.map((col, ci) => (
        <div
          key={ci}
          className="cr-reel flex shrink-0 flex-col gap-3"
          style={{
            animationDuration: `${44 + ci * 9}s`,
            animationDirection: ci % 2 ? "reverse" : "normal",
          }}
        >
          {[...col, ...col].map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={posterUrl(p, "w185") ?? undefined}
              alt=""
              className="w-28 rounded-lg sm:w-36"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
