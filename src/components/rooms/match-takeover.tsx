"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import type { Movie, SwipePlayer } from "@/lib/types";
import { backdropUrl, posterUrl } from "@/lib/tmdb";
import { Avatar, Button, Spinner } from "@/components/ui";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

const CONFETTI = ["🍿", "🎬", "✨", "🎉", "⭐", "🥂"];

/**
 * "IT'S A MATCH!" — takeover a schermo intero, il secondo momento wow dell'app.
 * Arriva a tutti i client via realtime (`swipe_sessions.status = 'matched'`),
 * quindi il montaggio di questo componente È la notifica: vibrazione, suono e
 * Notification di sistema partono da qui, ognuno con il suo fallback.
 */
export function MatchTakeover({
  movie,
  players,
  isCreator,
  busy,
  onConfirm,
  onDismiss,
}: {
  movie: Movie;
  players: SwipePlayer[];
  isCreator: boolean;
  busy: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const backdrop = backdropUrl(movie.backdrop_path, "w1280");
  const poster = posterUrl(movie.poster_path, "w500");

  useEffect(() => {
    notifyMatch(movie.title);
  }, [movie.title]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-sm">
      {backdrop && (
        <div aria-hidden className="pointer-events-none fixed inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={backdrop} alt="" className="h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/85 to-background" />
        </div>
      )}

      {!reduceMotion && <Confetti />}

      <div className="relative flex min-h-full flex-col items-center justify-center gap-6 px-5 py-10 text-center">
        <motion.p
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reduceMotion ? { duration: 0.15 } : { type: "spring", stiffness: 220, damping: 14 }}
          className="text-accent-gradient font-display text-4xl font-black tracking-tight sm:text-5xl"
        >
          IT&apos;S A MATCH! 🍿
        </motion.p>

        {poster && (
          <motion.img
            src={poster}
            alt={movie.title}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 80, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={reduceMotion ? { duration: 0.15 } : { delay: 0.15, type: "spring", stiffness: 130, damping: 18 }}
            className="w-52 rounded-3xl border border-accent-gold/40 shadow-[0_0_60px_-10px] shadow-accent-gold/50"
          />
        )}

        <div>
          <h2 className="font-display text-2xl font-bold leading-tight">{movie.title}</h2>
          <p className="mt-1 text-sm text-muted">
            {movie.release_year}
            {movie.genres?.length > 0 && ` · ${movie.genres.map((g) => g.name).join(", ")}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {players.map((p) => (
            <div key={p.user_id} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3">
              <Avatar src={p.avatar_url} name={p.username} size={28} />
              <span className="text-xs font-medium">{p.username}</span>
            </div>
          ))}
        </div>
        <p className="-mt-2 text-sm text-muted">Vi piace a tutti. Deciso.</p>

        <div className="flex w-full max-w-sm flex-col gap-3">
          {isCreator ? (
            <Button size="lg" onClick={onConfirm} disabled={busy}>
              {busy ? <Spinner /> : <Check className="size-5" />}
              🎬 Lo guardiamo stasera
            </Button>
          ) : (
            <p className="text-sm text-muted">
              Chi ha aperto la sessione conferma il film della serata.
            </p>
          )}
          <Button variant="ghost" onClick={onDismiss} disabled={busy}>
            <X className="size-4" />
            Chiudi
          </Button>
          <p className="text-xs text-muted">
            Chiudendo, la sessione si archivia: per continuare a swipare se ne
            apre una nuova.
          </p>
        </div>
      </div>
    </div>
  );
}

function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: -40, rotate: 0 }}
          animate={{ opacity: [0, 1, 1, 0], y: "100vh", rotate: (i % 2 ? 1 : -1) * 320 }}
          transition={{ duration: 2.6 + (i % 5) * 0.4, delay: (i % 8) * 0.15, ease: "easeIn" }}
          className="absolute text-2xl"
          style={{ left: `${(i * 4.2) % 100}%` }}
        >
          {CONFETTI[i % CONFETTI.length]}
        </motion.span>
      ))}
    </div>
  );
}

/**
 * Feedback fisico e di sistema, ognuno indipendente e opzionale: un browser che
 * non vibra o che ha negato le notifiche non deve rompere il takeover.
 * Il suono è sintetizzato (niente asset da scaricare) e comunque suona solo se
 * l'AudioContext parte — cioè se l'utente ha già interagito con la pagina.
 */
function notifyMatch(title: string) {
  try {
    navigator.vibrate?.([60, 40, 60, 40, 120]);
  } catch {}

  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) chime();

  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
      new Notification("It's a match! 🍿", { body: `Avete scelto ${title}`, tag: "cineroom-match" });
    }
  } catch {}
}

// Due note ascendenti, ~0.35s in tutto.
function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    if (ctx.state === "suspended") return void ctx.close();

    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

    for (const [freq, at] of [[660, 0], [990, 0.14]] as const) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + 0.2);
    }
    window.setTimeout(() => void ctx.close(), 600);
  } catch {}
}
