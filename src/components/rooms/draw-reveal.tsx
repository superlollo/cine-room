"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, RotateCcw } from "lucide-react";
import type { Movie } from "@/lib/types";
import { posterUrl } from "@/lib/tmdb";
import { Button, Spinner } from "@/components/ui";
import { MovieResultCard } from "./movie-result-card";

// Slot-machine di poster: gira ~2.3s decelerando, poi rivela il film estratto.
// Il componente viene rimontato dal parent (key = movie.tmdb_id) a ogni nuova
// estrazione, quindi l'animazione riparte da capo.
export function DrawReveal({
  movie,
  reelPosters,
  isHost,
  busyAction,
  onConfirm,
  onRedraw,
}: {
  movie: Movie;
  reelPosters: string[];
  isHost: boolean;
  busyAction: "confirm" | "redraw" | "newdraw" | "reset" | "widen" | null;
  onConfirm: () => void;
  onRedraw: () => void;
}) {
  const [phase, setPhase] = useState<"spin" | "reveal">("spin");
  const [frame, setFrame] = useState<string | null>(
    reelPosters[0] ?? movie.poster_path,
  );
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const posters = reelPosters.length
      ? reelPosters
      : ([movie.poster_path].filter(Boolean) as string[]);

    // Reduced motion o niente poster → vai diretto al risultato (async, non
    // sincrono nell'effect: rispetta le regole dei hook).
    if (reduce || posters.length <= 1) {
      const t = window.setTimeout(() => {
        setFrame(movie.poster_path);
        setPhase("reveal");
      }, 250);
      timers.current.push(t);
      return () => timers.current.forEach(clearTimeout);
    }

    // Schedule di delay crescenti (ease-out) per ~2.3s.
    const steps: number[] = [];
    let delay = 60;
    let total = 0;
    while (total < 2300) {
      steps.push(delay);
      total += delay;
      delay *= 1.14;
    }

    let i = 0;
    const tick = () => {
      setFrame(posters[Math.floor(Math.random() * posters.length)]);
      if (i < steps.length) {
        const t = window.setTimeout(tick, steps[i]);
        timers.current.push(t);
        i += 1;
      } else {
        setFrame(movie.poster_path);
        setPhase("reveal");
      }
    };
    const first = window.setTimeout(tick, steps[0]);
    timers.current.push(first);
    i = 1;

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    // Rimontato via key ad ogni nuovo film → eseguire una volta al mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "spin") {
    const src = posterUrl(frame, "w342");
    return (
      <div className="flex flex-col items-center gap-5 py-8">
        <div className="relative h-64 w-44 overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/50">
          {src && (
            <motion.img
              key={frame ?? ""}
              src={src}
              alt=""
              initial={{ opacity: 0.4, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.08 }}
              className="h-full w-full object-cover blur-[1px]"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
        <p className="animate-pulse font-display text-lg font-semibold text-accent-gold">
          Sto scegliendo il film…
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", damping: 18, stiffness: 220 }}
      className="space-y-6"
    >
      <MovieResultCard movie={movie} label="Estratto!" />

      {isHost ? (
        <div className="space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={onConfirm}
              disabled={busyAction !== null}
              className="flex-1"
            >
              {busyAction === "confirm" ? <Spinner /> : <Check className="size-5" />}
              {busyAction === "confirm" ? "Confermo…" : "Lo guardiamo!"}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={onRedraw}
              disabled={busyAction !== null}
              className="flex-1"
            >
              {busyAction === "redraw" ? <Spinner /> : <RotateCcw className="size-5" />}
              {busyAction === "redraw" ? "Ripesco…" : "Ripesca"}
            </Button>
          </div>
          <p className="text-center text-xs text-muted">
            Il film scartato non torna subito, ma potrà ricomparire in
            un&apos;estrazione successiva. Solo &laquo;Lo guardiamo!&raquo; lo
            esclude per sempre da questa stanza.
          </p>
        </div>
      ) : (
        <p className="text-center text-sm text-muted">
          L&apos;host sta decidendo…
        </p>
      )}
    </motion.div>
  );
}
