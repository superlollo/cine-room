"use client";

import { useState } from "react";
import { ChevronDown, History, MessageCircle, Star } from "lucide-react";
import type { Movie, MovieFeedback } from "@/lib/types";
import { posterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { WatchProviders } from "@/components/movies";
import { MovieDetailModal } from "./movie-detail-modal";

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Rome",
});
const timeFormatter = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

function formatSeenAt(iso: string) {
  const d = new Date(iso);
  return `${dateFormatter.format(d)} · ${timeFormatter.format(d)}`;
}

function emptyFeedback(): MovieFeedback {
  return { ratings: [], reactions: [], comments: [] };
}

export function RoomHistory({
  history,
  roomId,
  currentUserId,
  feedbackByMovie,
}: {
  history: { movie: Movie; excludedAt: string }[];
  roomId: string;
  currentUserId: string;
  feedbackByMovie: Record<number, MovieFeedback>;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<{ movie: Movie; excludedAt: string } | null>(null);
  if (history.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 p-4 text-sm text-muted transition hover:text-foreground"
      >
        <History className="size-4" />
        Visti insieme ({history.length})
        <ChevronDown
          className={cn("ml-auto size-4 transition", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-2 p-4 pt-0">
          {history.map((h) => {
            const fb = feedbackByMovie[h.movie.tmdb_id] ?? emptyFeedback();
            const avg =
              fb.ratings.length > 0
                ? fb.ratings.reduce((acc, r) => acc + r.stars, 0) / fb.ratings.length
                : null;
            const reactionCounts: Record<string, number> = {};
            for (const r of fb.reactions)
              reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
            const topReactions = Object.entries(reactionCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3);

            return (
              <button
                key={h.movie.tmdb_id}
                onClick={() => setSelected(h)}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2 text-left transition hover:bg-white/[0.05]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={posterUrl(h.movie.poster_path, "w185") ?? undefined}
                  alt={h.movie.title}
                  className="aspect-[2/3] w-12 shrink-0 rounded-md border border-white/10 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {h.movie.title}
                  </p>
                  <p className="text-xs text-muted">
                    visto il {formatSeenAt(h.excludedAt)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    {avg != null && (
                      <span className="flex items-center gap-1">
                        <Star className="size-3 fill-accent-gold text-accent-gold" />
                        {avg.toFixed(1)} · {fb.ratings.length}
                      </span>
                    )}
                    {topReactions.map(([emoji, n]) => (
                      <span key={emoji}>
                        {emoji}×{n}
                      </span>
                    ))}
                    {fb.comments.length > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageCircle className="size-3" />
                        {fb.comments.length}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5">
                    <WatchProviders
                      movie={h.movie}
                      size="sm"
                      autoRefresh={false}
                      interactive={false}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <MovieDetailModal
          open={!!selected}
          onClose={() => setSelected(null)}
          movie={selected.movie}
          excludedAt={selected.excludedAt}
          roomId={roomId}
          currentUserId={currentUserId}
          feedback={feedbackByMovie[selected.movie.tmdb_id] ?? emptyFeedback()}
        />
      )}
    </section>
  );
}
