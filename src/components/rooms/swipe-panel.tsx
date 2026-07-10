"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Flame, LogIn, X } from "lucide-react";
import type { SwipeSession, SwipePlayer } from "@/lib/types";
import { MOVIE_GENRES } from "@/lib/genres";
import {
  cancelSwipeSession,
  createSwipeSession,
  joinSwipeSession,
  setSwipeReady,
  updateSwipeSetup,
} from "@/lib/actions/swipe";
import { Avatar, Button, Spinner, useToast } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useSwipeSession } from "./use-swipe-session";

export function SwipePanel({
  roomId,
  currentUserId,
  session,
  players,
}: {
  roomId: string;
  currentUserId: string;
  session: SwipeSession | null;
  players: SwipePlayer[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [isPending, startTransition] = useTransition();

  useSwipeSession(roomId, session?.id ?? null, () => router.refresh());

  const me = players.find((p) => p.user_id === currentUserId) ?? null;
  const isCreator = session?.created_by === currentUserId;
  const locked = busy || isPending;

  // Ogni azione: mostra l'errore, altrimenti lascia che sia il refresh (nostro o
  // via realtime) a portare lo stato nuovo.
  async function run(action: () => Promise<{ error: string } | unknown>) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (result && typeof result === "object" && "error" in result) {
      return toast.error((result as { error: string }).error);
    }
    startTransition(() => router.refresh());
  }

  if (!session) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold">Non vi decidete?</p>
            <p className="text-sm text-muted">
              Swipate insieme sulle stesse card: quando un film piace a tutti, è
              match.
            </p>
          </div>
          <Button
            onClick={() => run(() => createSwipeSession(roomId))}
            disabled={locked}
            className="shrink-0"
          >
            {locked ? <Spinner /> : <Flame className="size-5" />}
            Modalità swipe
          </Button>
        </div>
      </section>
    );
  }

  if (session.status === "swiping") {
    return (
      <section className="rounded-3xl border border-accent-gold/30 bg-white/[0.03] p-8 text-center">
        <div className="text-4xl">🔥</div>
        <h2 className="mt-2 font-display text-xl font-bold">Mazzo pronto!</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          {session.deck.length} card vi aspettano. Le card swipabili arrivano
          domani.
        </p>
        {isCreator && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-5"
            disabled={locked}
            onClick={() => run(() => cancelSwipeSession(session.id))}
          >
            {locked ? <Spinner /> : <X className="size-4" />}
            Chiudi sessione
          </Button>
        )}
      </section>
    );
  }

  // status === 'setup' → lobby
  const selected = new Set(session.genre_ids);
  const allReady = players.length >= 2 && players.every((p) => p.ready);

  function toggleGenre(id: number) {
    const next = selected.has(id)
      ? session!.genre_ids.filter((g) => g !== id)
      : [...session!.genre_ids, id];
    run(() => updateSwipeSetup(session!.id, next, session!.include_suggestions));
  }

  return (
    <section className="space-y-6 rounded-3xl border border-accent-gold/30 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">
            🔥 Sessione swipe
          </h2>
          <p className="text-sm text-muted">
            {isCreator
              ? "Scegli le categorie: parte quando siete tutti pronti."
              : "Chi ha aperto la sessione sceglie le categorie."}
          </p>
        </div>
        {isCreator && (
          <button
            onClick={() => run(() => cancelSwipeSession(session.id))}
            disabled={locked}
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted transition hover:bg-white/10 hover:text-foreground disabled:opacity-50"
          >
            Annulla sessione
          </button>
        )}
      </div>

      {/* Categorie */}
      <div>
        <p className="mb-2 text-sm font-semibold text-muted">
          Categorie{" "}
          <span className="font-normal">
            {selected.size === 0 ? "(tutte)" : `(${selected.size})`}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          {MOVIE_GENRES.map((g) => {
            const active = selected.has(g.id);
            return (
              <button
                key={g.id}
                onClick={() => toggleGenre(g.id)}
                disabled={!isCreator || locked}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition",
                  active
                    ? "border-accent-gold/70 bg-white/10 text-foreground"
                    : "border-white/10 bg-white/5 text-muted",
                  isCreator && !locked
                    ? "hover:bg-white/10"
                    : "cursor-default disabled:opacity-100",
                )}
              >
                <span className="mr-1">{g.emoji}</span>
                {g.label}
              </button>
            );
          })}
        </div>

        <label
          className={cn(
            "mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm",
            isCreator && !locked ? "cursor-pointer" : "opacity-80",
          )}
        >
          <input
            type="checkbox"
            checked={session.include_suggestions}
            disabled={!isCreator || locked}
            onChange={(e) =>
              run(() =>
                updateSwipeSetup(session.id, session.genre_ids, e.target.checked),
              )
            }
            className="size-4 accent-accent-gold"
          />
          <span className="min-w-0">
            Includi suggerimenti fuori dalle liste
            <span className="block text-xs text-muted">
              Film popolari delle stesse categorie, presi da TMDB.
            </span>
          </span>
        </label>
      </div>

      {/* Partecipanti */}
      <div>
        <p className="mb-2 text-sm font-semibold text-muted">
          Chi swipa ({players.length})
        </p>
        {players.length === 0 ? (
          <p className="text-sm text-muted">Nessuno, per ora.</p>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {players.map((p) => (
                <motion.li
                  key={p.user_id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  <Avatar src={p.avatar_url} name={p.username} size={32} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {p.username}
                    {p.user_id === currentUserId && (
                      <span className="ml-1.5 text-xs text-muted">(tu)</span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm">
                    {p.ready ? "🟢 pronto" : "🟡 in attesa"}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* Azione */}
      {me ? (
        <div className="space-y-2">
          <Button
            variant={me.ready ? "ghost" : "primary"}
            className="w-full"
            disabled={locked}
            onClick={() => run(() => setSwipeReady(session.id, !me.ready))}
          >
            {locked ? <Spinner /> : me.ready ? <X className="size-5" /> : <Check className="size-5" />}
            {me.ready ? "Non sono più pronto" : "Pronto!"}
          </Button>
          <p className="text-center text-xs text-muted">
            {players.length < 2
              ? "Serve almeno un altro partecipante."
              : allReady
                ? "Si parte…"
                : "Si parte quando siete tutti pronti."}
          </p>
        </div>
      ) : (
        <Button
          className="w-full"
          disabled={locked}
          onClick={() => run(() => joinSwipeSession(session.id))}
        >
          {locked ? <Spinner /> : <LogIn className="size-5" />}
          Partecipo
        </Button>
      )}
    </section>
  );
}
