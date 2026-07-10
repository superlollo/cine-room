"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Sparkles, Star } from "lucide-react";
import type { Movie, MovieFeedback, RoomRecommendation } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { posterUrl } from "@/lib/tmdb";
import { Modal, Skeleton, Spinner, useToast } from "@/components/ui";
import { MovieDetailModal } from "@/components/movies";

const MAX_SEEDS = 5;

export function RoomRecommendations({
  roomId,
  history = [],
  feedbackByMovie = {},
  myLists,
}: {
  roomId: string;
  history: { movie: Movie; excludedAt: string }[];
  feedbackByMovie: Record<number, MovieFeedback>;
  myLists: { id: string; name: string; emoji: string }[];
}) {
  const supabase = createClient();
  const toast = useToast();
  const hasHistory = history.length > 0;

  // Firma dei semi effettivi (stessi ultimi 5 visti + media voti che usa la
  // route): cambia sia con un nuovo film visto sia con un nuovo voto su un
  // seme esistente, così l'effetto sotto rifetcha in entrambi i casi.
  const seedsSignature = useMemo(() => {
    return history
      .slice(0, MAX_SEEDS)
      .map((h) => {
        const ratings = feedbackByMovie[h.movie.tmdb_id]?.ratings ?? [];
        const avg =
          ratings.length > 0
            ? ratings.reduce((acc, r) => acc + r.stars, 0) / ratings.length
            : null;
        return `${h.movie.tmdb_id}:${avg ?? "x"}`;
      })
      .join(",");
  }, [history, feedbackByMovie]);

  const [loading, setLoading] = useState(hasHistory);
  const [recs, setRecs] = useState<RoomRecommendation[]>([]);
  const [detailMovie, setDetailMovie] = useState<Movie | null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null);
  const [addTarget, setAddTarget] = useState<RoomRecommendation | null>(null);
  const [addingListId, setAddingListId] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHistory) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/rooms/${roomId}/recommendations`)
      .then((res) => (res.ok ? res.json() : { recommendations: [] }))
      .then((data: { recommendations?: RoomRecommendation[] }) => {
        if (!cancelled) setRecs(data.recommendations ?? []);
      })
      .catch(() => {
        if (!cancelled) setRecs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roomId, hasHistory, seedsSignature]);

  if (!hasHistory) return null;
  if (!loading && recs.length === 0) return null;

  async function openDetail(rec: RoomRecommendation) {
    setLoadingDetailId(rec.movie.tmdb_id);
    try {
      const res = await fetch(`/api/tmdb/movie/${rec.movie.tmdb_id}`);
      if (!res.ok) throw new Error();
      const { movie } = (await res.json()) as { movie: Movie };
      setDetailMovie(movie);
    } catch {
      toast.error("Errore nel caricamento del film.");
    } finally {
      setLoadingDetailId(null);
    }
  }

  async function addToList(listId: string) {
    if (!addTarget) return;
    setAddingListId(listId);
    try {
      const res = await fetch(`/api/tmdb/movie/${addTarget.movie.tmdb_id}`);
      if (!res.ok) throw new Error();
      const { error } = await supabase
        .from("list_movies")
        .insert({ list_id: listId, movie_id: addTarget.movie.tmdb_id });
      if (error) {
        if (error.code === "23505") toast.info("Film già presente nella lista.");
        else throw new Error();
        return;
      }
      toast.success("Film aggiunto alla lista.");
      setAddTarget(null);
    } catch {
      toast.error("Errore nell'aggiunta del film.");
    } finally {
      setAddingListId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
        <Sparkles className="size-4" />
        Consigliati per voi ✨
      </h2>

      <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-32 shrink-0 snap-start">
                <Skeleton className="aspect-[2/3] w-full" />
              </div>
            ))
          : recs.map((rec) => (
              <div key={rec.movie.tmdb_id} className="w-32 shrink-0 snap-start">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetail(rec)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openDetail(rec);
                    }
                  }}
                  className="group relative block aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-xl border border-white/10 outline-none focus-visible:ring-2 focus-visible:ring-accent-gold/60"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={posterUrl(rec.movie.poster_path, "w342") ?? undefined}
                    alt={rec.movie.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                  {loadingDetailId === rec.movie.tmdb_id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <Spinner className="text-white" />
                    </div>
                  )}
                  {typeof rec.movie.vote_average === "number" &&
                    rec.movie.vote_average > 0 && (
                      <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-lg bg-black/70 px-1.5 py-0.5 text-xs font-medium backdrop-blur">
                        <Star className="size-3 fill-accent-gold text-accent-gold" />
                        {rec.movie.vote_average.toFixed(1)}
                      </span>
                    )}
                  <button
                    type="button"
                    aria-label={`Aggiungi ${rec.movie.title} a una lista`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddTarget(rec);
                    }}
                    className="absolute bottom-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur transition hover:bg-accent-gold hover:text-black"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <p className="mt-1.5 truncate text-xs font-medium">
                  {rec.movie.title}
                </p>
                <p className="truncate text-[11px] text-muted">
                  Perché avete visto {rec.reasonTitle}
                  {rec.reasonStars != null && ` ⭐ ${rec.reasonStars.toFixed(1)}`}
                </p>
              </div>
            ))}
      </div>

      <MovieDetailModal movie={detailMovie} onClose={() => setDetailMovie(null)} />

      <Modal
        open={!!addTarget}
        onClose={() => setAddTarget(null)}
        title="Aggiungi a una lista"
      >
        {myLists.length === 0 ? (
          <p className="text-sm text-muted">Non hai ancora nessuna lista.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {myLists.map((l) => (
              <button
                key={l.id}
                onClick={() => addToList(l.id)}
                disabled={addingListId !== null}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left text-sm transition hover:bg-white/[0.06] disabled:opacity-50"
              >
                <span className="text-xl">{l.emoji}</span>
                <span className="flex-1 truncate font-medium">{l.name}</span>
                {addingListId === l.id && <Spinner className="size-4" />}
              </button>
            ))}
          </div>
        )}
      </Modal>
    </section>
  );
}
