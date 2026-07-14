"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Star, X } from "lucide-react";
import type { Movie } from "@/lib/types";
import { backdropUrl, posterUrl } from "@/lib/tmdb";
import { WatchProviders } from "./watch-providers";

function formatRuntime(min: number | null): string | null {
  if (!min || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function MovieDetailModal({
  movie,
  onClose,
}: {
  movie: Movie | null;
  onClose: () => void;
}) {
  const backdrop = backdropUrl(movie?.backdrop_path, "w1280");
  const poster = posterUrl(movie?.poster_path, "w342");
  const runtime = formatRuntime(movie?.runtime ?? null);

  return (
    <AnimatePresence>
      {movie && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            className="relative z-10 max-h-[90dvh] w-full max-w-lg overflow-hidden overflow-y-auto rounded-3xl border border-white/10 bg-surface shadow-2xl shadow-black/60"
          >
            {/* Backdrop header */}
            <div className="relative h-40 w-full bg-surface-2">
              {backdrop && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={backdrop}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
              <button
                onClick={onClose}
                aria-label="Chiudi"
                className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex gap-4 px-6 pb-6 -mt-16">
              {poster && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={poster}
                  alt={movie.title}
                  className="h-40 w-28 shrink-0 rounded-xl border border-white/10 object-cover shadow-lg"
                />
              )}
              <div className="min-w-0 self-end pb-1">
                <h2 className="font-display text-xl font-bold leading-tight">
                  {movie.title}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  {movie.release_year && <span>{movie.release_year}</span>}
                  {runtime && <span>{runtime}</span>}
                  {typeof movie.vote_average === "number" &&
                    movie.vote_average > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="size-3.5 fill-accent-gold text-accent-gold" />
                        {movie.vote_average.toFixed(1)}
                      </span>
                    )}
                </div>
              </div>
            </div>

            <div className="space-y-4 px-6 pb-6">
              <WatchProviders movie={movie} />
              {movie.genres?.length > 0 && (
                <div className="flex flex-wrap gap-2">
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
              {movie.overview ? (
                <p className="text-sm leading-relaxed text-foreground/90">
                  {movie.overview}
                </p>
              ) : (
                <p className="text-sm text-muted">Nessuna trama disponibile.</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
