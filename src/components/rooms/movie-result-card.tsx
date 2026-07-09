import { Star } from "lucide-react";
import type { Movie } from "@/lib/types";
import { backdropUrl, posterUrl } from "@/lib/tmdb";

function formatRuntime(min: number | null): string | null {
  if (!min || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Scheda risultato di un film estratto/deciso. Il backdrop diventa lo sfondo
// della pagina (fixed, sfumato). Presentazionale — riusata da DrawReveal e dallo
// stato "deciso".
export function MovieResultCard({
  movie,
  label,
}: {
  movie: Movie;
  label?: string;
}) {
  const backdrop = backdropUrl(movie.backdrop_path, "w1280");
  const poster = posterUrl(movie.poster_path, "w342");
  const runtime = formatRuntime(movie.runtime);

  return (
    <>
      {backdrop && (
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={backdrop} alt="" className="h-full w-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/85 to-background" />
        </div>
      )}

      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt={movie.title}
            className="w-40 shrink-0 rounded-2xl border border-white/10 shadow-2xl shadow-black/60"
          />
        )}
        <div className="min-w-0">
          {label && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent-gold">
              {label}
            </p>
          )}
          <h2 className="font-display text-3xl font-bold leading-tight">
            {movie.title}
          </h2>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted sm:justify-start">
            {movie.release_year && <span>{movie.release_year}</span>}
            {runtime && <span>{runtime}</span>}
            {typeof movie.vote_average === "number" && movie.vote_average > 0 && (
              <span className="flex items-center gap-1">
                <Star className="size-3.5 fill-accent-gold text-accent-gold" />
                {movie.vote_average.toFixed(1)}
              </span>
            )}
          </div>
          {movie.genres?.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {movie.genres.map((g) => (
                <span
                  key={g.id}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-muted"
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}
          {movie.overview && (
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-foreground/85">
              {movie.overview}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
