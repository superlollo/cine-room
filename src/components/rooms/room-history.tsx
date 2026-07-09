"use client";

import { useState } from "react";
import { ChevronDown, History } from "lucide-react";
import type { Movie } from "@/lib/types";
import { posterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

export function RoomHistory({
  history,
}: {
  history: { movie: Movie; excludedAt: string }[];
}) {
  const [open, setOpen] = useState(false);
  if (history.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 p-4 text-sm text-muted transition hover:text-foreground"
      >
        <History className="size-4" />
        Già estratti in questa stanza ({history.length})
        <ChevronDown
          className={cn("ml-auto size-4 transition", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="flex flex-wrap gap-3 p-4 pt-0">
          {history.map((h) => (
            <div key={h.movie.tmdb_id} className="w-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={posterUrl(h.movie.poster_path, "w185") ?? undefined}
                alt={h.movie.title}
                className="aspect-[2/3] w-16 rounded-md border border-white/10 object-cover"
              />
              <p className="mt-1 truncate text-[10px] text-muted">
                {h.movie.title}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
