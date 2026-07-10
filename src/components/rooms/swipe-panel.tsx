"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Flame, LogIn, X } from "lucide-react";
import type { Movie, SwipeSession, SwipePlayer, SwipeVote } from "@/lib/types";
import { MOVIE_GENRES } from "@/lib/genres";
import {
  archiveSwipeSession,
  cancelSwipeSession,
  confirmSwipeMatch,
  createSwipeSession,
  joinSwipeSession,
  setSwipeReady,
  updateSwipeSetup,
} from "@/lib/actions/swipe";
import { posterUrl } from "@/lib/tmdb";
import { Avatar, Button, Modal, Spinner, useToast } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useSwipeSession } from "./use-swipe-session";
import { SwipeDeck } from "./swipe-deck";
import { MatchTakeover } from "./match-takeover";

export function SwipePanel({
  roomId,
  currentUserId,
  session,
  players,
  deck,
  votes,
}: {
  roomId: string;
  currentUserId: string;
  session: SwipeSession | null;
  players: SwipePlayer[];
  deck: Movie[];
  votes: SwipeVote[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [endOpen, setEndOpen] = useState(false);

  useSwipeSession(roomId, session?.id ?? null, () => router.refresh());

  const me = players.find((p) => p.user_id === currentUserId) ?? null;
  const isCreator = session?.created_by === currentUserId;
  const locked = busy || isPending;

  // Quanti voti ha espresso ciascuno: è il "dove sono arrivati gli altri", mai
  // il "cosa hanno votato".
  const votedBy = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of votes) counts[v.user_id] = (counts[v.user_id] ?? 0) + 1;
    return counts;
  }, [votes]);

  const myVoted = useMemo(
    () => new Set(votes.filter((v) => v.user_id === currentUserId).map((v) => v.movie_id)),
    [votes, currentUserId],
  );

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

  // Match: takeover fuori dal flusso della pagina, ovunque tu sia nella stanza.
  const matchedMovie =
    session.status === "matched"
      ? (deck.find((m) => m.tmdb_id === session.matched_movie_id) ?? null)
      : null;

  if (matchedMovie) {
    return (
      <MatchTakeover
        movie={matchedMovie}
        players={players}
        isCreator={isCreator}
        busy={locked}
        onConfirm={() => run(() => confirmSwipeMatch(session.id))}
        onDismiss={() => run(() => archiveSwipeSession(session.id))}
      />
    );
  }

  // `ended`, e anche il caso limite di un match il cui film non è più in cache.
  if (session.status === "ended" || session.status === "matched") {
    return (
      <NoMatch
        deck={deck}
        votes={votes}
        playerCount={players.length}
        locked={locked}
        onClose={() => run(() => archiveSwipeSession(session.id))}
        onRetry={() =>
          run(async () => {
            const closed = await archiveSwipeSession(session.id);
            if (closed && "error" in closed) return closed;
            return createSwipeSession(roomId);
          })
        }
      />
    );
  }

  if (session.status === "swiping") {
    const others = players.filter((p) => p.user_id !== currentUserId);
    return (
      <section className="space-y-6 rounded-3xl border border-accent-gold/30 bg-white/[0.03] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">🔥 Sessione swipe</h2>
            <p className="text-sm text-muted">
              {me
                ? "Un film che piace a tutti chiude la partita."
                : "La sessione è già partita: puoi solo guardare."}
            </p>
          </div>
          {isCreator && (
            <button
              onClick={() => setEndOpen(true)}
              disabled={locked}
              className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted transition hover:bg-white/10 hover:text-foreground disabled:opacity-50"
            >
              Termina
            </button>
          )}
        </div>

        {me ? (
          <SwipeDeck
            key={session.id}
            sessionId={session.id}
            deck={deck}
            alreadyVoted={myVoted}
          />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <div className="text-3xl">👀</div>
            <p className="mt-2 font-display font-semibold">Sessione in corso</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
              Il mazzo è congelato su chi ha detto &laquo;Pronto&raquo;: entrerai
              nella prossima.
            </p>
          </div>
        )}

        <Progress
          players={others}
          votedBy={votedBy}
          total={deck.length}
          label={me ? "Gli altri" : "Chi swipa"}
        />

        <Modal open={endOpen} onClose={() => setEndOpen(false)} title="Terminare la sessione?">
          <p className="text-sm text-muted">
            La sessione si chiude senza match per tutti. Serve se qualcuno ha
            abbandonato: il match richiede il &laquo;sì&raquo; di tutti i
            partecipanti iniziali, quindi chi non torna blocca gli altri.
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="ghost" onClick={() => setEndOpen(false)} className="flex-1">
              Annulla
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              disabled={locked}
              onClick={() => {
                setEndOpen(false);
                run(() => cancelSwipeSession(session.id));
              }}
            >
              {locked && <Spinner />}
              Termina senza match
            </Button>
          </div>
        </Modal>
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
            {me
              ? "Scegli le categorie: parte quando siete tutti pronti."
              : "I partecipanti scelgono le categorie: premi \"Partecipo\" per aiutare a decidere."}
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
        <div className="grid grid-cols-3 gap-2">
          {MOVIE_GENRES.map((g) => {
            const active = selected.has(g.id);
            return (
              <button
                key={g.id}
                onClick={() => toggleGenre(g.id)}
                disabled={!me || locked}
                className={cn(
                  "rounded-full border px-2 py-1 text-xs transition",
                  active
                    ? "border-accent-gold/70 bg-white/10 text-foreground"
                    : "border-white/10 bg-white/5 text-muted",
                  me && !locked
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
            me && !locked ? "cursor-pointer" : "opacity-80",
          )}
        >
          <input
            type="checkbox"
            checked={session.include_suggestions}
            disabled={!me || locked}
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

/** Dove sono arrivati gli altri: solo il conteggio, mai i loro like. */
function Progress({
  players,
  votedBy,
  total,
  label,
}: {
  players: SwipePlayer[];
  votedBy: Record<string, number>;
  total: number;
  label: string;
}) {
  if (players.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-muted">{label}</p>
      <ul className="space-y-1.5">
        {players.map((p) => {
          const done = votedBy[p.user_id] ?? 0;
          return (
            <li key={p.user_id} className="flex items-center gap-2.5 text-sm">
              <Avatar src={p.avatar_url} name={p.username} size={24} />
              <span className="min-w-0 flex-1 truncate">{p.username}</span>
              <span className="shrink-0 font-mono text-xs text-muted">
                {p.finished ? "finito ✅" : `${done}/${total}`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Nessun accordo: si mostrano i film "quasi match" (like di tutti tranne uno),
 * che sono il miglior compromesso disponibile e spesso sbloccano la serata.
 */
function NoMatch({
  deck,
  votes,
  playerCount,
  locked,
  onClose,
  onRetry,
}: {
  deck: Movie[];
  votes: SwipeVote[];
  playerCount: number;
  locked: boolean;
  onClose: () => void;
  onRetry: () => void;
}) {
  const nearMisses = useMemo(() => {
    if (playerCount < 2) return [];
    const likes: Record<number, number> = {};
    for (const v of votes) if (v.liked) likes[v.movie_id] = (likes[v.movie_id] ?? 0) + 1;
    return deck
      .filter((m) => likes[m.tmdb_id] === playerCount - 1)
      .slice(0, 3);
  }, [deck, votes, playerCount]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center">
      <div className="text-4xl">😅</div>
      <h2 className="mt-2 font-display text-xl font-bold">Nessun match</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
        Nessun film ha convinto proprio tutti.
        {nearMisses.length > 0 && " Questi ci sono andati vicino:"}
      </p>

      {nearMisses.length > 0 && (
        <ul className="mx-auto mt-5 flex max-w-md flex-wrap justify-center gap-4">
          {nearMisses.map((m) => {
            const src = posterUrl(m.poster_path, "w185");
            return (
              <li key={m.tmdb_id} className="w-24">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" className="w-full rounded-xl border border-white/10" />
                ) : (
                  <div className="flex aspect-[2/3] items-center justify-center rounded-xl border border-white/10 bg-white/5 text-2xl">
                    🎬
                  </div>
                )}
                <p className="mt-1.5 truncate text-xs text-muted">{m.title}</p>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Button onClick={onRetry} disabled={locked}>
          {locked ? <Spinner /> : <Flame className="size-5" />}
          Riprova con altre categorie
        </Button>
        <Button variant="ghost" onClick={onClose} disabled={locked}>
          Torna all&apos;estrazione classica
        </Button>
      </div>
    </section>
  );
}
