"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MoreVertical, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import type { Movie, RoomStatus } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Button, Modal, Spinner, useToast } from "@/components/ui";
import { posterUrl } from "@/lib/tmdb";
import { CopyInviteButton } from "./copy-invite-button";
import { useRoomRealtime } from "./use-room-realtime";
import { LobbyBody, type LobbyMember } from "./lobby-body";
import { DrawReveal } from "./draw-reveal";
import { MovieResultCard } from "./movie-result-card";
import { RoomHistory } from "./room-history";

export function RoomView({
  room,
  currentUserId,
  isHost,
  members,
  pool,
  myLists,
  mySelectedListId,
  currentMovie,
  history,
}: {
  room: { id: string; code: string; name: string; status: RoomStatus };
  currentUserId: string;
  isHost: boolean;
  members: LobbyMember[];
  pool: { count: number; posters: string[] };
  myLists: { id: string; name: string; emoji: string; count: number }[];
  mySelectedListId: string | null;
  currentMovie: Movie | null;
  history: { movie: Movie; excludedAt: string }[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  const [savingId, setSavingId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [busy, setBusy] = useState(false);
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
    router.refresh();
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
    router.refresh();
  }

  async function confirmMovie() {
    if (!currentMovie) return;
    setBusy(true);
    await supabase
      .from("room_exclusions")
      .insert({ room_id: room.id, movie_id: currentMovie.tmdb_id });
    const { error } = await supabase
      .from("rooms")
      .update({ status: "decided" })
      .eq("id", room.id);
    setBusy(false);
    if (error) return toast.error("Errore nella conferma.");
    router.refresh();
  }

  // "Ripesca" NON brucia il film (niente room_exclusions): lo scarta solo per
  // questo turno, passandolo come temp_exclude. Se il turno esaurisce le
  // opzioni fresche, si ricomincia il ciclo (temp_exclude vuoto) invece di
  // mostrare "pool esaurito" a torto.
  async function redrawMovie() {
    if (!currentMovie) return;
    setBusy(true);
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
      setBusy(false);
      return toast.error("Errore nel ripescaggio.");
    }
    if (movieId == null) {
      await supabase
        .from("rooms")
        .update({ status: "drawing", current_movie_id: null })
        .eq("id", room.id);
    }
    setBusy(false);
    router.refresh();
  }

  async function newDraw() {
    setBusy(true);
    setSkippedThisRound([]);
    await supabase
      .from("rooms")
      .update({ status: "open", current_movie_id: null })
      .eq("id", room.id);
    setBusy(false);
    router.refresh();
  }

  async function resetExclusions() {
    setBusy(true);
    setSkippedThisRound([]);
    await supabase.from("room_exclusions").delete().eq("room_id", room.id);
    await supabase
      .from("rooms")
      .update({ status: "open", current_movie_id: null })
      .eq("id", room.id);
    setBusy(false);
    setMenuOpen(false);
    toast.success("Film già visti azzerati.");
    router.refresh();
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
                        <RotateCcw className="size-4" /> Azzera film già visti
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
      {isOpen && (
        <LobbyBody
          members={members}
          currentUserId={currentUserId}
          myLists={myLists}
          mySelectedListId={mySelectedListId}
          pool={pool}
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
          busy={busy}
          onConfirm={confirmMovie}
          onRedraw={redrawMovie}
        />
      )}

      {isExhausted && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <div className="text-4xl">🏆</div>
          <h2 className="mt-2 font-display text-2xl font-bold">
            Avete visto tutto!
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Il cilindro è vuoto: tutti i film delle liste scelte sono già stati
            estratti in questa stanza.
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
          {isHost && (
            <Button onClick={newDraw} disabled={busy} variant="ghost">
              {busy ? <Spinner /> : <Sparkles className="size-5" />}
              Nuova estrazione
            </Button>
          )}
        </motion.div>
      )}

      <RoomHistory history={history} />

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
