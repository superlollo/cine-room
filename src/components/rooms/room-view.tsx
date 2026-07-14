"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MoreVertical, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import type {
  Movie,
  MovieFeedback,
  RoomStatus,
  SwipePlayer,
  SwipeSession,
  SwipeVote,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Button, Modal, Spinner, useToast } from "@/components/ui";
import { posterUrl } from "@/lib/tmdb";
import { CopyInviteButton } from "./copy-invite-button";
import { useRoomRealtime } from "./use-room-realtime";
import { LobbyBody, type LobbyMember } from "./lobby-body";
import { DrawReveal } from "./draw-reveal";
import { MovieResultCard } from "./movie-result-card";
import { RoomHistory } from "./room-history";
import { RoomRecommendations } from "./room-recommendations";
import { MovieFeedbackPanel } from "./movie-feedback-panel";
import { SwipePanel } from "./swipe-panel";

export function RoomView({
  room,
  currentUserId,
  isHost,
  members,
  pool,
  poolCountUnfiltered,
  myLists,
  mySelectedListId,
  currentMovie,
  history,
  feedbackByMovie,
  swipeSession,
  swipePlayers,
  swipeDeck,
  swipeVotes,
}: {
  room: {
    id: string;
    code: string;
    name: string;
    status: RoomStatus;
    filterMaxRuntime: number | null;
    filterGenreIds: number[];
    filterPlatformIds: number[];
  };
  currentUserId: string;
  isHost: boolean;
  members: LobbyMember[];
  pool: { count: number; posters: string[] };
  // Pool al netto delle sole esclusioni (senza i filtri): serve a distinguere,
  // nella schermata "Avete visto tutto", pool esaurito per esclusioni (pool
  // grezzo anch'esso 0) da pool vuoto per i filtri (grezzo > 0).
  poolCountUnfiltered: number;
  myLists: { id: string; name: string; emoji: string; count: number }[];
  mySelectedListId: string | null;
  currentMovie: Movie | null;
  history: { movie: Movie; excludedAt: string }[];
  feedbackByMovie: Record<number, MovieFeedback>;
  swipeSession: SwipeSession | null;
  swipePlayers: SwipePlayer[];
  swipeDeck: Movie[];
  swipeVotes: SwipeVote[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  const [savingId, setSavingId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [busyAction, setBusyAction] = useState<
    "confirm" | "redraw" | "newdraw" | "reset" | "widen" | null
  >(null);
  const [isPending, startTransition] = useTransition();
  // busy = true durante tutta l'operazione (supabase + refresh server)
  const busy = busyAction !== null || isPending;

  // Resetta busyAction solo quando il refresh è completato (isPending → false).
  useEffect(() => {
    if (!isPending) setBusyAction(null);
  }, [isPending]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Film scartati con "Ripesca" in QUESTO turno: solo locale, mai persistito
  // (Ripesca non brucia il film — solo la conferma lo fa).
  const [skippedThisRound, setSkippedThisRound] = useState<number[]>([]);

  useRoomRealtime(room.id, () => router.refresh());

  // Precarica i poster del pool per un'animazione fluida.
  useEffect(() => {
    for (const p of pool.posters) {
      const url = posterUrl(p, "w342");
      if (url) {
        const img = new Image();
        img.src = url;
      }
    }
  }, [pool.posters]);

  async function selectList(listId: string | null) {
    setSavingId(listId ?? "__none__");
    const { error } = await supabase
      .from("room_members")
      .update({ selected_list_id: listId })
      .eq("room_id", room.id)
      .eq("user_id", currentUserId);
    setSavingId(null);
    if (error) return toast.error("Errore nel salvare la scelta.");
    startTransition(() => router.refresh());
  }

  // Estrae; se il pool è esaurito (null) porta lo stato a "drawing senza film".
  async function drawMovie() {
    setDrawing(true);
    setSkippedThisRound([]);
    const { data: movieId, error } = await supabase.rpc("draw_movie", {
      p_room_id: room.id,
      p_temp_exclude: [],
    });
    if (error) {
      setDrawing(false);
      return toast.error("Errore nell'estrazione.");
    }
    if (movieId == null) {
      await supabase
        .from("rooms")
        .update({ status: "drawing", current_movie_id: null })
        .eq("id", room.id);
    }
    setDrawing(false);
    startTransition(() => router.refresh());
  }

  async function confirmMovie() {
    if (!currentMovie) return;
    setBusyAction("confirm");
    await supabase
      .from("room_exclusions")
      .insert({ room_id: room.id, movie_id: currentMovie.tmdb_id });
    const { error } = await supabase
      .from("rooms")
      .update({ status: "decided" })
      .eq("id", room.id);
    if (error) {
      setBusyAction(null);
      return toast.error("Errore nella conferma.");
    }
    startTransition(() => router.refresh());
  }

  // "Ripesca" NON brucia il film (niente room_exclusions): lo scarta solo per
  // questo turno, passandolo come temp_exclude. Se il turno esaurisce le
  // opzioni fresche, si ricomincia il ciclo (temp_exclude vuoto) invece di
  // mostrare "pool esaurito" a torto.
  async function redrawMovie() {
    if (!currentMovie) return;
    setBusyAction("redraw");
    const roundSkip = [...skippedThisRound, currentMovie.tmdb_id];
    let { data: movieId, error } = await supabase.rpc("draw_movie", {
      p_room_id: room.id,
      p_temp_exclude: roundSkip,
    });
    if (!error && movieId == null && roundSkip.length > 0) {
      setSkippedThisRound([]);
      ({ data: movieId, error } = await supabase.rpc("draw_movie", {
        p_room_id: room.id,
        p_temp_exclude: [],
      }));
    } else {
      setSkippedThisRound(roundSkip);
    }
    if (error) {
      setBusyAction(null);
      return toast.error("Errore nel ripescaggio.");
    }
    if (movieId == null) {
      await supabase
        .from("rooms")
        .update({ status: "drawing", current_movie_id: null })
        .eq("id", room.id);
    }
    startTransition(() => router.refresh());
  }

  async function newDraw() {
    setBusyAction("newdraw");
    setSkippedThisRound([]);
    await supabase
      .from("rooms")
      .update({ status: "open", current_movie_id: null })
      .eq("id", room.id);
    startTransition(() => router.refresh());
  }

  async function resetExclusions() {
    setBusyAction("reset");
    setSkippedThisRound([]);
    await supabase.from("room_exclusions").delete().eq("room_id", room.id);
    await supabase
      .from("rooms")
      .update({ status: "open", current_movie_id: null })
      .eq("id", room.id);
    setMenuOpen(false);
    toast.success("Film già visti azzerati.");
    startTransition(() => router.refresh());
  }

  // Pool vuoto per colpa dei filtri, non delle esclusioni: qui "ricominciare"
  // non serve, serve allargarli. Un tap li azzera entrambi.
  async function widenFilters() {
    setBusyAction("widen");
    const { error } = await supabase
      .from("rooms")
      .update({
        filter_max_runtime: null,
        filter_genre_ids: [],
        platform_ids: [],
        status: "open",
        current_movie_id: null,
      })
      .eq("id", room.id);
    if (error) {
      setBusyAction(null);
      return toast.error("Errore nell'allargare i filtri.");
    }
    startTransition(() => router.refresh());
  }

  async function deleteRoom() {
    setDeleting(true);
    const { error } = await supabase.from("rooms").delete().eq("id", room.id);
    if (error) {
      setDeleting(false);
      return toast.error("Errore nell'eliminazione della stanza.");
    }
    toast.success("Stanza eliminata.");
    router.push("/home");
    router.refresh();
  }

  // Con lo swipe in corso il mazzo prende la scena: la lobby (liste, pool,
  // bottone estrai) sparirebbe comunque sotto le card su mobile.
  const swipeActive =
    swipeSession?.status === "swiping" || swipeSession?.status === "matched";

  // Macchina a stati
  const isDrawing = room.status === "drawing" && !!currentMovie;
  const isExhausted = room.status === "drawing" && !currentMovie;
  const isDecided = room.status === "decided" && !!currentMovie;
  const isOpen = !isDrawing && !isExhausted && !isDecided;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{room.name}</h1>
          <p className="mt-1 text-sm text-muted">
            Codice:{" "}
            <span className="font-mono tracking-wider text-foreground">
              {room.code}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CopyInviteButton code={room.code} roomName={room.name} />
          {isHost && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Opzioni stanza"
                className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted transition hover:bg-white/10 hover:text-foreground"
              >
                <MoreVertical className="size-5" />
              </button>
              {menuOpen && (
                <>
                  <button
                    aria-hidden
                    tabIndex={-1}
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-surface shadow-xl shadow-black/40">
                    {history.length > 0 && (
                      <button
                        onClick={resetExclusions}
                        disabled={busy}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-white/5 disabled:opacity-50"
                      >
                        {busyAction === "reset" ? <Spinner className="size-4" /> : <RotateCcw className="size-4" />}
                        {busyAction === "reset" ? "Azzerando…" : "Azzera film già visti"}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setDeleteOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-accent-red transition hover:bg-accent-red/10"
                    >
                      <Trash2 className="size-4" /> Elimina stanza
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Corpo per stato */}
      {isOpen && !swipeActive && (
        <LobbyBody
          roomId={room.id}
          members={members}
          currentUserId={currentUserId}
          myLists={myLists}
          mySelectedListId={mySelectedListId}
          pool={pool}
          poolCountUnfiltered={poolCountUnfiltered}
          filterMaxRuntime={room.filterMaxRuntime}
          filterGenreIds={room.filterGenreIds}
          filterPlatformIds={room.filterPlatformIds}
          isHost={isHost}
          savingId={savingId}
          drawing={drawing}
          onSelect={selectList}
          onDraw={drawMovie}
        />
      )}

      {isDrawing && currentMovie && (
        <DrawReveal
          key={currentMovie.tmdb_id}
          movie={currentMovie}
          reelPosters={pool.posters}
          isHost={isHost}
          busyAction={busyAction}
          onConfirm={confirmMovie}
          onRedraw={redrawMovie}
        />
      )}

      {isExhausted && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
          {poolCountUnfiltered === 0 ? (
            <>
              <div className="text-4xl">🏆</div>
              <h2 className="mt-2 font-display text-2xl font-bold">
                Avete visto tutto!
              </h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                Il cilindro è vuoto: tutti i film delle liste scelte sono già
                stati estratti in questa stanza.
              </p>
              {isHost ? (
                <div className="mt-5 flex flex-col items-center gap-2">
                  <Button onClick={resetExclusions} disabled={busy}>
                    {busy ? <Spinner /> : <RotateCcw className="size-5" />}
                    Ricomincia da capo
                  </Button>
                  <p className="text-xs text-muted">
                    Oppure tornate alla selezione e cambiate lista.
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted">
                  L&apos;host può ricominciare da capo.
                </p>
              )}
            </>
          ) : (
            <>
              <div className="text-4xl">🎚️</div>
              <h2 className="mt-2 font-display text-2xl font-bold">
                Nessun film rispetta i filtri
              </h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                Il cilindro ha film disponibili, ma i filtri attivi (durata,
                generi o piattaforme) li escludono tutti.
              </p>
              {isHost ? (
                <div className="mt-5 flex flex-col items-center gap-2">
                  <Button onClick={widenFilters} disabled={busy}>
                    {busy ? <Spinner /> : <RotateCcw className="size-5" />}
                    Allarga i filtri
                  </Button>
                  <p className="text-xs text-muted">
                    Oppure modificali dal pannello &laquo;Filtri
                    estrazione&raquo;.
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted">
                  L&apos;host può allargare i filtri.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {isDecided && currentMovie && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative space-y-6 rounded-3xl border border-accent-gold/20 bg-white/[0.03] p-6"
        >
          <Celebration />
          <MovieResultCard movie={currentMovie} label="🍿 Film della serata" />
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="mb-3 text-sm font-semibold text-muted">Com&apos;era?</p>
            <MovieFeedbackPanel
              roomId={room.id}
              movieId={currentMovie.tmdb_id}
              currentUserId={currentUserId}
              feedback={
                feedbackByMovie[currentMovie.tmdb_id] ?? {
                  ratings: [],
                  reactions: [],
                  comments: [],
                }
              }
              showComments={false}
            />
          </div>
          {isHost && (
            <Button onClick={newDraw} disabled={busy} variant="ghost">
              {busyAction === "newdraw" ? <Spinner /> : <Sparkles className="size-5" />}
              {busyAction === "newdraw" ? "Preparando…" : "Nuova estrazione"}
            </Button>
          )}
        </motion.div>
      )}

      {/* Alternativa all'estrazione: aperta a chiunque, non solo all'host.
          Nascosta durante l'estrazione, che ha già la scena tutta per sé. */}
      {(isOpen || isDecided) && (
        <SwipePanel
          roomId={room.id}
          currentUserId={currentUserId}
          session={swipeSession}
          players={swipePlayers}
          deck={swipeDeck}
          votes={swipeVotes}
        />
      )}

      <RoomHistory
        history={history}
        roomId={room.id}
        currentUserId={currentUserId}
        feedbackByMovie={feedbackByMovie}
      />

      <RoomRecommendations
        roomId={room.id}
        history={history}
        feedbackByMovie={feedbackByMovie}
        myLists={myLists}
      />

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Eliminare la stanza?"
      >
        <p className="text-sm text-muted">
          &laquo;{room.name}&raquo; verrà eliminata per tutti i partecipanti,
          insieme a esclusioni ed estrazioni. Le liste dei membri non vengono
          toccate. L&apos;azione non è reversibile.
        </p>
        <div className="mt-6 flex gap-3">
          <Button
            variant="ghost"
            onClick={() => setDeleteOpen(false)}
            className="flex-1"
          >
            Annulla
          </Button>
          <Button
            variant="danger"
            onClick={deleteRoom}
            disabled={deleting}
            className="flex-1"
          >
            {deleting && <Spinner />}
            Elimina
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// Piccolo burst di particelle discreto sulla conferma.
function Celebration() {
  const bits = ["🍿", "🎬", "✨", "🎉", "⭐"];
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 flex justify-center overflow-hidden"
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 0, scale: 0.6 }}
          animate={{ opacity: [0, 1, 0], y: -60 - ((i * 37) % 40), scale: 1 }}
          transition={{ duration: 1.6, delay: i * 0.06, ease: "easeOut" }}
          className="absolute text-lg"
          style={{ left: `${10 + i * 8}%` }}
        >
          {bits[i % bits.length]}
        </motion.span>
      ))}
    </div>
  );
}
