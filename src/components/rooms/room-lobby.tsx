"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clapperboard, Crown, Film, MoreVertical, Trash2 } from "lucide-react";
import type { RoomStatus } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Avatar, Button, Modal, Spinner, useToast } from "@/components/ui";
import { posterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { CopyInviteButton } from "./copy-invite-button";
import { useRoomRealtime } from "./use-room-realtime";

interface LobbyMember {
  userId: string;
  username: string;
  avatarUrl: string | null;
  isHost: boolean;
  selectedList: { id: string; name: string; emoji: string } | null;
}

export function RoomLobby({
  room,
  currentUserId,
  isHost,
  members,
  pool,
  myLists,
  mySelectedListId,
}: {
  room: { id: string; code: string; name: string; status: RoomStatus };
  currentUserId: string;
  isHost: boolean;
  members: LobbyMember[];
  pool: { count: number; posters: string[] };
  myLists: { id: string; name: string; emoji: string; count: number }[];
  mySelectedListId: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();
  const [savingId, setSavingId] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Realtime: a ogni cambiamento della stanza, ricarica i dati server.
  useRoomRealtime(room.id, () => router.refresh());

  async function selectList(listId: string | null) {
    setSavingId(listId ?? "__none__");
    const { error } = await supabase
      .from("room_members")
      .update({ selected_list_id: listId })
      .eq("room_id", room.id)
      .eq("user_id", currentUserId);
    setSavingId(null);
    if (error) {
      toast.error("Errore nel salvare la scelta.");
      return;
    }
    router.refresh();
  }

  async function deleteRoom() {
    setDeleting(true);
    const { error } = await supabase.from("rooms").delete().eq("id", room.id);
    if (error) {
      setDeleting(false);
      toast.error("Errore nell'eliminazione della stanza.");
      return;
    }
    toast.success("Stanza eliminata.");
    router.push("/home");
    router.refresh();
  }

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
                  <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-surface shadow-xl shadow-black/40">
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
                  onClick={() => selectList(active ? null : l.id)}
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

      {/* Pool + estrazione */}
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-4">
          <PoolCollage posters={pool.posters} />
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold">
              {pool.count} {pool.count === 1 ? "film" : "film"} nel cilindro
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
              disabled={pool.count === 0}
              onClick={() =>
                toast.info("L'estrazione arriva al Giorno 6! 🎬")
              }
              className="w-full"
            >
              <Clapperboard className="size-5" />
              Estrai il film
            </Button>
          ) : (
            <p className="text-center text-sm text-muted">
              L&apos;host farà partire l&apos;estrazione.
            </p>
          )}
          {isHost && pool.count === 0 && (
            <p className="mt-2 text-center text-xs text-muted">
              Serve almeno una lista scelta con dei film.
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
