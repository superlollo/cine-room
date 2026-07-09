"use client";

import { useState } from "react";
import { ChevronDown, History } from "lucide-react";
import type { Movie } from "@/lib/types";
import { posterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

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
        Visti insieme ({history.length})
        <ChevronDown
          className={cn("ml-auto size-4 transition", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-2 p-4 pt-0">
          {history.map((h) => (
            <div
              key={h.movie.tmdb_id}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={posterUrl(h.movie.poster_path, "w185") ?? undefined}
                alt={h.movie.title}
                className="aspect-[2/3] w-12 shrink-0 rounded-md border border-white/10 object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {h.movie.title}
                </p>
                <p className="text-xs text-muted">
                  visto il {formatSeenAt(h.excludedAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
