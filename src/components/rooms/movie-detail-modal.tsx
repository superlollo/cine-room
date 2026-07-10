"use client";

import type { Movie, MovieFeedback } from "@/lib/types";
import { Modal } from "@/components/ui";
import { backdropUrl, posterUrl } from "@/lib/tmdb";
import { MovieFeedbackPanel } from "./movie-feedback-panel";

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Rome",
});
const timeFormatter = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

export function MovieDetailModal({
  open,
  onClose,
  movie,
  excludedAt,
  roomId,
  currentUserId,
  feedback,
}: {
  open: boolean;
  onClose: () => void;
  movie: Movie;
  excludedAt: string;
  roomId: string;
  currentUserId: string;
  feedback: MovieFeedback;
}) {
  const backdrop = backdropUrl(movie.backdrop_path, "w780");
  const poster = posterUrl(movie.poster_path, "w185");
  const seenAt = new Date(excludedAt);

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg">
      <div className="-m-6 mb-0 overflow-hidden rounded-t-3xl">
        <div className="relative h-32">
          {backdrop && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={backdrop} alt="" className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
        </div>
      </div>

      <div className="-mt-10 flex items-end gap-3">
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt={movie.title}
            className="w-16 shrink-0 rounded-xl border border-white/10 shadow-xl shadow-black/50"
          />
        )}
        <div className="min-w-0 pb-1">
          <h2 className="truncate font-display text-lg font-bold">
            {movie.title}
          </h2>
          <p className="text-xs text-muted">
            Visto il {dateFormatter.format(seenAt)} · {timeFormatter.format(seenAt)}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-white/10 pt-5">
        <MovieFeedbackPanel
          roomId={roomId}
          movieId={movie.tmdb_id}
          currentUserId={currentUserId}
          feedback={feedback}
        />
      </div>
    </Modal>
  );
}
