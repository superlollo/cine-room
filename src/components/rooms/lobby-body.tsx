"use client";

import Link from "next/link";
import { Check, Clapperboard, Crown, Film } from "lucide-react";
import { Button, Avatar, Spinner } from "@/components/ui";
import { posterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { DrawFiltersPanel } from "./draw-filters-panel";

export interface LobbyMember {
  userId: string;
  username: string;
  avatarUrl: string | null;
  isHost: boolean;
  selectedList: { id: string; name: string; emoji: string } | null;
}

export function LobbyBody({
  roomId,
  members,
  currentUserId,
  myLists,
  mySelectedListId,
  pool,
  poolCountUnfiltered,
  filterMaxRuntime,
  filterGenreIds,
  isHost,
  savingId,
  drawing,
  onSelect,
  onDraw,
}: {
  roomId: string;
  members: LobbyMember[];
  currentUserId: string;
  myLists: { id: string; name: string; emoji: string; count: number }[];
  mySelectedListId: string | null;
  pool: { count: number; posters: string[] };
  poolCountUnfiltered: number;
  filterMaxRuntime: number | null;
  filterGenreIds: number[];
  isHost: boolean;
  savingId: string | null;
  drawing: boolean;
  onSelect: (listId: string | null) => void;
  onDraw: () => void;
}) {
  // Pool vuoto per colpa dei filtri (non ci sono film che li rispettano) vs
  // pool davvero esaurito/senza liste: messaggi diversi sotto il bottone.
  const emptyByFilters = pool.count === 0 && poolCountUnfiltered > 0;
  return (
    <div className="space-y-8">
      {/* Membri */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted">
          Partecipanti ({members.length})
        </h2>
        <ul className="space-y-2">
          {members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
            >
              <Avatar src={m.avatarUrl} name={m.username} size={36} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                  {m.username}
                  {m.userId === currentUserId && (
                    <span className="text-xs text-muted">(tu)</span>
                  )}
                  {m.isHost && <Crown className="size-3.5 text-accent-gold" />}
                </p>
              </div>
              <span className="shrink-0 text-sm">
                {m.selectedList ? (
                  <span className="text-foreground/90">
                    {m.selectedList.emoji} {m.selectedList.name}
                  </span>
                ) : (
                  <span className="text-muted">non ha ancora scelto</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Selettore lista (le proprie) */}
      <section>
        <h2 className="mb-1 text-sm font-semibold text-muted">La tua lista</h2>
        <p className="mb-3 text-xs text-muted">
          Scegli una delle tue liste: i suoi film entreranno nel cilindro.
        </p>
        {myLists.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-muted">
            Non hai ancora liste.{" "}
            <Link href="/home" className="text-accent-gold hover:underline">
              Creane una
            </Link>
            .
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {myLists.map((l) => {
              const active = mySelectedListId === l.id;
              const saving = savingId === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => onSelect(active ? null : l.id)}
                  disabled={!!savingId}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl border p-3 text-left transition disabled:opacity-60",
                    active
                      ? "border-accent-gold/70 bg-white/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10",
                  )}
                >
                  <span className="text-2xl">{l.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {l.name}
                    </span>
                    <span className="block text-xs text-muted">
                      {l.count} film
                    </span>
                  </span>
                  {saving ? (
                    <Spinner className="text-muted" size={16} />
                  ) : active ? (
                    <Check className="size-4 text-accent-gold" />
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Filtri estrazione */}
      <DrawFiltersPanel
        roomId={roomId}
        isHost={isHost}
        maxRuntime={filterMaxRuntime}
        genreIds={filterGenreIds}
      />

      {/* Pool + estrazione */}
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-4">
          <PoolCollage posters={pool.posters} />
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold">
              {pool.count} film nel cilindro
            </p>
            <p className="text-sm text-muted">
              Unione delle liste scelte, meno i film già visti in questa stanza.
            </p>
          </div>
        </div>

        <div className="mt-5">
          {isHost ? (
            <Button
              size="lg"
              disabled={pool.count === 0 || drawing}
              onClick={onDraw}
              className={cn(
                "w-full",
                pool.count > 0 && !drawing && "pulse-glow",
              )}
            >
              {drawing ? <Spinner /> : <Clapperboard className="size-5" />}
              {drawing ? "Estraggo…" : "Estrai il film"}
            </Button>
          ) : (
            <p className="text-center text-sm text-muted">
              L&apos;host farà partire l&apos;estrazione.
            </p>
          )}
          {isHost && pool.count === 0 && (
            <p className="mt-2 text-center text-xs text-muted">
              {emptyByFilters
                ? "Nessun film rispetta i filtri — allargateli."
                : "Serve almeno una lista scelta con dei film."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function PoolCollage({ posters }: { posters: string[] }) {
  if (posters.length === 0) {
    return (
      <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-surface-2 text-muted">
        <Film className="size-6" />
      </div>
    );
  }
  return (
    <div className="flex shrink-0 -space-x-4">
      {posters.slice(0, 4).map((p, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={posterUrl(p, "w185") ?? undefined}
          alt=""
          style={{ zIndex: 4 - i }}
          className="h-20 w-[3.4rem] rounded-md border border-black/40 object-cover shadow-md"
        />
      ))}
    </div>
  );
}
