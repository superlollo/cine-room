"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MOVIE_GENRES } from "@/lib/genres";
import { RUNTIME_FILTER_OPTIONS } from "@/lib/draw-filters";
import { STREAMING_PLATFORMS } from "@/lib/platforms";
import { backfillRoomProviders } from "@/lib/actions/watch-providers";
import { TMDB_IMAGE_BASE } from "@/lib/tmdb";
import { useToast } from "@/components/ui";
import { cn } from "@/lib/utils";

// Pannello collassabile dei filtri estrazione: visibile a tutti, modificabile
// solo dall'host. Le modifiche vanno su `rooms` (già in realtime per tutti i
// membri via useRoomRealtime); il badge riassuntivo resta leggibile anche a
// pannello chiuso così nessuno si chiede perché il cilindro si è ristretto.
export function DrawFiltersPanel({
  roomId,
  isHost,
  maxRuntime,
  genreIds,
  platformIds,
}: {
  roomId: string;
  isHost: boolean;
  maxRuntime: number | null;
  genreIds: number[];
  platformIds: number[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const active = maxRuntime != null || genreIds.length > 0 || platformIds.length > 0;
  const runtimeLabel = RUNTIME_FILTER_OPTIONS.find((o) => o.value === maxRuntime)?.label;
  const genreLabel = genreIds
    .map((id) => MOVIE_GENRES.find((g) => g.id === id)?.label)
    .filter(Boolean)
    .join(", ");
  const platformLabel = platformIds
    .map((id) => STREAMING_PLATFORMS.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .join(", ");

  async function update(patch: {
    filter_max_runtime?: number | null;
    filter_genre_ids?: number[];
    platform_ids?: number[];
  }) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("rooms").update(patch).eq("id", roomId);
    setSaving(false);
    if (error) return toast.error("Errore nel salvare i filtri.");
    router.refresh();
  }

  function toggleGenre(id: number) {
    const next = genreIds.includes(id)
      ? genreIds.filter((g) => g !== id)
      : [...genreIds, id];
    update({ filter_genre_ids: next });
  }

  // Attivare il filtro piattaforme richiede che i film del pool abbiano dati
  // provider: la prima volta la maggior parte non li ha ancora (colonna
  // null), quindi il backfill parte in background subito dopo il toggle —
  // fire-and-forget, un secondo refresh arriva da solo a backfill concluso.
  async function togglePlatform(id: number) {
    const next = platformIds.includes(id)
      ? platformIds.filter((p) => p !== id)
      : [...platformIds, id];
    await update({ platform_ids: next });
    if (next.length > 0) {
      backfillRoomProviders(roomId)
        .then(() => router.refresh())
        .catch(() => {});
    }
  }

  const disabled = !isHost || saving;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-muted">
          <SlidersHorizontal className="size-4 shrink-0" />
          Filtri estrazione
          {active && (
            <span className="truncate rounded-full border border-accent-gold/40 bg-accent-gold/10 px-2 py-0.5 text-xs font-normal text-accent-gold">
              {[
                maxRuntime != null ? runtimeLabel : null,
                genreIds.length > 0 ? genreLabel : null,
                platformIds.length > 0 ? platformLabel : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted transition", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {!isHost && (
            <p className="text-xs text-muted">Solo l&apos;host può modificare i filtri.</p>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold text-muted">Durata massima</p>
            <div className="flex flex-wrap gap-2">
              {RUNTIME_FILTER_OPTIONS.map((o) => {
                const isActive = maxRuntime === o.value;
                return (
                  <button
                    key={o.label}
                    onClick={() => update({ filter_max_runtime: o.value })}
                    disabled={disabled}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition disabled:cursor-default",
                      isActive
                        ? "border-accent-gold/70 bg-white/10 text-foreground"
                        : "border-white/10 bg-white/5 text-muted",
                      isHost && !saving && "hover:bg-white/10",
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-muted">
              Generi{" "}
              <span className="font-normal">
                {genreIds.length === 0 ? "(tutti)" : `(${genreIds.length})`}
              </span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              {MOVIE_GENRES.map((g) => {
                const isActive = genreIds.includes(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGenre(g.id)}
                    disabled={disabled}
                    className={cn(
                      "rounded-full border px-2 py-1 text-xs transition disabled:cursor-default",
                      isActive
                        ? "border-accent-gold/70 bg-white/10 text-foreground"
                        : "border-white/10 bg-white/5 text-muted",
                      isHost && !saving && "hover:bg-white/10",
                    )}
                  >
                    <span className="mr-1">{g.emoji}</span>
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-muted">
              Le nostre piattaforme{" "}
              <span className="font-normal">
                {platformIds.length === 0 ? "(tutte)" : `(${platformIds.length})`}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {STREAMING_PLATFORMS.map((p) => {
                const isActive = platformIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    disabled={disabled}
                    title={p.name}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition disabled:cursor-default",
                      isActive
                        ? "border-accent-gold/70 bg-white/10 text-foreground"
                        : "border-white/10 bg-white/5 text-muted",
                      isHost && !saving && "hover:bg-white/10",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${TMDB_IMAGE_BASE}/w45${p.logoPath}`}
                      alt=""
                      className="size-4 shrink-0 rounded-full object-cover"
                    />
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
