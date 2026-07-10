"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { Heart, Star, X } from "lucide-react";
import type { Movie } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { posterUrl } from "@/lib/tmdb";
import { useToast } from "@/components/ui";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

// Oltre questo spostamento orizzontale (o con un flick abbastanza veloce) la
// card è considerata votata e vola via.
const SWIPE_THRESHOLD = 110;
const FLICK_VELOCITY = 500;

type CastResult = { matched?: boolean; finished?: boolean; error?: string };

/**
 * Il mazzo swipabile. Le card già votate non tornano: la coda iniziale è il
 * deck meno i voti già presenti sul server, quindi un refresh a metà sessione
 * riprende esattamente dalla card giusta.
 *
 * Ogni voto è ottimistico: la card vola via subito e la RPC `cast_swipe` parte
 * in parallelo. Se fallisce, la card torna in cima con un toast.
 */
export function SwipeDeck({
  sessionId,
  deck,
  alreadyVoted,
}: {
  sessionId: string;
  deck: Movie[];
  alreadyVoted: Set<number>;
}) {
  const router = useRouter();
  const toast = useToast();
  const reduceMotion = usePrefersReducedMotion();

  const [queue, setQueue] = useState<Movie[]>(() =>
    deck.filter((m) => !alreadyVoted.has(m.tmdb_id)),
  );
  const [dir, setDir] = useState<1 | -1>(1);

  const voted = deck.length - queue.length;
  const top = queue[0] ?? null;

  // Il permesso per le notifiche si chiede qui — all'inizio della sessione, con
  // l'utente che sta guardando le card — e mai a freddo altrove nell'app.
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission().catch(() => {});
    }
  }, []);

  const vote = useCallback(
    async (movie: Movie, liked: boolean) => {
      setDir(liked ? 1 : -1);
      setQueue((q) => q.filter((m) => m.tmdb_id !== movie.tmdb_id));

      const supabase = createClient();
      const { data, error } = await supabase.rpc("cast_swipe", {
        p_session_id: sessionId,
        p_movie_id: movie.tmdb_id,
        p_liked: liked,
      });

      const result = (data ?? {}) as CastResult;
      if (error || result.error) {
        setQueue((q) => [movie, ...q]);
        return toast.error("Voto non registrato, riprova.");
      }
      // Match e fine mazzo cambiano lo stato della sessione: il realtime
      // arriverebbe comunque, ma per chi ha votato il refresh dev'essere subito.
      if (result.matched || result.finished) router.refresh();
    },
    [router, sessionId, toast],
  );

  // Frecce da tastiera: swipe senza mouse né dita (desktop).
  useEffect(() => {
    if (!top) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") vote(top!, false);
      else if (e.key === "ArrowRight") vote(top!, true);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [top, vote]);

  if (!top) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <div className="text-4xl">✅</div>
        <h3 className="mt-2 font-display text-lg font-bold">Hai finito!</h3>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
          Hai visto tutte le {deck.length} card. Aspetta che finiscano gli altri.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Barra di avanzamento */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
          <span>Il tuo mazzo</span>
          <span className="font-mono">
            {voted} / {deck.length}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="bg-accent-gradient h-full"
            animate={{ width: `${(voted / deck.length) * 100}%` }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>
      </div>

      {/* Lo stack: la card in cima è l'unica trascinabile, dietro si intravedono
          le prossime due, scalate e spostate in giù. */}
      <div className="relative mx-auto aspect-[2/3] w-full max-w-[19rem]">
        {queue
          .slice(1, 3)
          .map((movie, i) => ({ movie, depth: i + 1 }))
          .reverse() // la più lontana per prima: le successive le stanno sopra
          .map(({ movie, depth }) => (
            <motion.div
              key={movie.tmdb_id}
              aria-hidden
              initial={false}
              animate={{ scale: 1 - depth * 0.05, y: depth * 14 }}
              transition={reduceMotion ? { duration: 0 } : undefined}
              className="absolute inset-0 overflow-hidden rounded-3xl border border-white/10 bg-surface shadow-2xl shadow-black/50"
            >
              <Poster movie={movie} />
            </motion.div>
          ))}

        <AnimatePresence initial={false} mode="popLayout">
          <TopCard
            key={top.tmdb_id}
            movie={top}
            dir={dir}
            reduceMotion={reduceMotion}
            onVote={(liked) => vote(top, liked)}
          />
        </AnimatePresence>
      </div>

      {/* Bottoni: per desktop e per chi non ama i gesti */}
      <div className="mt-6 flex items-center justify-center gap-6">
        <button
          onClick={() => vote(top, false)}
          aria-label={`Scarta ${top.title}`}
          className="flex size-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition hover:border-accent-red/40 hover:bg-accent-red/10 hover:text-accent-red"
        >
          <X className="size-7" />
        </button>
        <button
          onClick={() => vote(top, true)}
          aria-label={`Mi piace ${top.title}`}
          className="bg-accent-gradient flex size-16 items-center justify-center rounded-full text-black shadow-lg shadow-accent-red/25 transition hover:brightness-110"
        >
          <Heart className="size-7 fill-current" />
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-muted">
        Trascina la card, usa i bottoni o le frecce ← →
      </p>
    </div>
  );
}

function TopCard({
  movie,
  dir,
  reduceMotion,
  onVote,
}: {
  movie: Movie;
  dir: 1 | -1;
  reduceMotion: boolean;
  onVote: (liked: boolean) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], reduceMotion ? [0, 0] : [-14, 14]);
  const likeOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);
  const nopeOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0]);
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      drag="x"
      dragSnapToOrigin
      dragElastic={0.6}
      style={{ x, rotate }}
      onDragEnd={(_, info) => {
        const far = Math.abs(info.offset.x) > SWIPE_THRESHOLD;
        const flick = Math.abs(info.velocity.x) > FLICK_VELOCITY;
        if (far || flick) onVote(info.offset.x > 0);
      }}
      exit={
        reduceMotion
          ? { opacity: 0, transition: { duration: 0.12 } }
          : { x: dir * 600, opacity: 0, rotate: dir * 20, transition: { duration: 0.28 } }
      }
      className="absolute inset-0 cursor-grab touch-pan-y overflow-hidden rounded-3xl border border-white/10 bg-surface shadow-2xl shadow-black/60 active:cursor-grabbing"
    >
      <Poster movie={movie} />

      {/* Overlay del verdetto, in dissolvenza col trascinamento */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="pointer-events-none absolute left-4 top-4 rotate-[-12deg] rounded-xl border-2 border-emerald-400 px-3 py-1 font-display text-lg font-bold text-emerald-400"
      >
        🍿 LO GUARDO
      </motion.div>
      <motion.div
        style={{ opacity: nopeOpacity }}
        className="pointer-events-none absolute right-4 top-4 rotate-[12deg] rounded-xl border-2 border-accent-red px-3 py-1 font-display text-lg font-bold text-accent-red"
      >
        👎 NO
      </motion.div>

      {/* Tap sulla card → trama */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="absolute inset-x-0 bottom-0 cursor-pointer p-4 text-left"
      >
        <span className="sr-only">Mostra la trama di {movie.title}</span>
        <div aria-hidden className="pointer-events-none">
          <p className="font-display text-xl font-bold leading-tight">{movie.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-white/70">
            {movie.release_year && <span>{movie.release_year}</span>}
            {typeof movie.vote_average === "number" && movie.vote_average > 0 && (
              <span className="flex items-center gap-1">
                <Star className="size-3 fill-accent-gold text-accent-gold" />
                {movie.vote_average.toFixed(1)}
              </span>
            )}
            {movie.genres?.slice(0, 2).map((g) => (
              <span key={g.id} className="rounded-full bg-white/10 px-2 py-0.5">
                {g.name}
              </span>
            ))}
          </div>
          <AnimatePresence initial={false}>
            {open && movie.overview && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 overflow-hidden text-xs leading-relaxed text-white/75"
              >
                {movie.overview}
              </motion.p>
            )}
          </AnimatePresence>
          {!open && movie.overview && (
            <p className="mt-2 text-[11px] uppercase tracking-wide text-white/40">
              Tocca per la trama
            </p>
          )}
        </div>
      </button>
    </motion.div>
  );
}

function Poster({ movie }: { movie: Movie }) {
  const src = posterUrl(movie.poster_path, "w500");
  return (
    <>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          draggable={false}
          className="pointer-events-none h-full w-full select-none object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-5xl">🎬</div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
    </>
  );
}
