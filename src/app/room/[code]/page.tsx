import Link from "next/link";
import { notFound } from "next/navigation";
import type { RoomStatus } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { ToastProvider } from "@/components/ui";
import { RoomShell } from "@/components/rooms/room-shell";
import { RoomInvite } from "@/components/rooms/room-invite";
import { JoinRoom } from "@/components/rooms/join-room";
import { RoomLobby } from "@/components/rooms/room-lobby";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: room } = await supabase
    .from("rooms")
    .select("id, code, name, host_id, status, current_movie_id")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (!room) notFound();

  const { data: hostProfile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", room.host_id)
    .single();
  const hostName = hostProfile?.username ?? "qualcuno";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Caso 1 — non loggato
  if (!user) {
    return (
      <RoomShell>
        <RoomInvite
          roomName={room.name}
          hostName={hostName}
          subtitle="Accedi o registrati per entrare nella stanza."
        >
          <Link
            href={`/login?redirectedFrom=${encodeURIComponent(`/room/${room.code}`)}`}
            className="bg-accent-gradient inline-flex h-12 items-center justify-center rounded-2xl px-8 font-semibold text-black shadow-lg shadow-accent-red/20 transition hover:brightness-110"
          >
            Accedi o registrati
          </Link>
        </RoomInvite>
      </RoomShell>
    );
  }

  // È membro?
  const { data: membership } = await supabase
    .from("room_members")
    .select("user_id")
    .eq("room_id", room.id)
    .eq("user_id", user.id)
    .maybeSingle();

  // Caso 2 — loggato, non membro
  if (!membership) {
    return (
      <RoomShell>
        <RoomInvite
          roomName={room.name}
          hostName={hostName}
          subtitle="Entra per scegliere una tua lista e decidere insieme."
        >
          <JoinRoom roomId={room.id} userId={user.id} />
        </RoomInvite>
      </RoomShell>
    );
  }

  // Caso 3 — membro → lobby
  const { data: memberRows } = await supabase
    .from("room_members")
    .select(
      "user_id, selected_list_id, joined_at, profiles(username, avatar_url), lists(id, name, emoji)",
    )
    .eq("room_id", room.id)
    .order("joined_at");

  const members = (memberRows ?? []).map((m) => {
    const profile = m.profiles as unknown as {
      username: string;
      avatar_url: string | null;
    } | null;
    const selList = m.lists as unknown as {
      id: string;
      name: string;
      emoji: string;
    } | null;
    return {
      userId: m.user_id as string,
      username: profile?.username ?? "utente",
      avatarUrl: profile?.avatar_url ?? null,
      isHost: m.user_id === room.host_id,
      selectedList: selList
        ? { id: selList.id, name: selList.name, emoji: selList.emoji }
        : null,
    };
  });

  // Pool = unione (dedup) delle liste scelte, meno le esclusioni della stanza
  const selectedListIds = members
    .map((m) => m.selectedList?.id)
    .filter((id): id is string => !!id);
  let poolCount = 0;
  let poolPosters: string[] = [];
  if (selectedListIds.length > 0) {
    const { data: lm } = await supabase
      .from("list_movies")
      .select("movie_id, movies(poster_path)")
      .in("list_id", selectedListIds);
    const { data: excl } = await supabase
      .from("room_exclusions")
      .select("movie_id")
      .eq("room_id", room.id);
    const exclSet = new Set((excl ?? []).map((e) => e.movie_id));
    const uniq = new Map<number, string | null>();
    for (const row of lm ?? []) {
      if (exclSet.has(row.movie_id)) continue;
      if (!uniq.has(row.movie_id)) {
        const poster = (
          row.movies as unknown as { poster_path: string | null } | null
        )?.poster_path;
        uniq.set(row.movie_id, poster ?? null);
      }
    }
    poolCount = uniq.size;
    poolPosters = [...uniq.values()]
      .filter((p): p is string => !!p)
      .slice(0, 6);
  }

  // Le liste dell'utente corrente (per il selettore), con conteggio film
  const { data: myListRows } = await supabase
    .from("lists")
    .select("id, name, emoji")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  const myListIds = (myListRows ?? []).map((l) => l.id);
  const myCounts: Record<string, number> = {};
  if (myListIds.length > 0) {
    const { data: myLm } = await supabase
      .from("list_movies")
      .select("list_id")
      .in("list_id", myListIds);
    for (const row of myLm ?? [])
      myCounts[row.list_id] = (myCounts[row.list_id] ?? 0) + 1;
  }
  const myLists = (myListRows ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    emoji: l.emoji,
    count: myCounts[l.id] ?? 0,
  }));

  const mySelectedListId =
    members.find((m) => m.userId === user.id)?.selectedList?.id ?? null;

  return (
    <ToastProvider>
      <RoomShell>
        <RoomLobby
          room={{
            id: room.id,
            code: room.code,
            name: room.name,
            status: room.status as RoomStatus,
          }}
          currentUserId={user.id}
          isHost={room.host_id === user.id}
          members={members}
          pool={{ count: poolCount, posters: poolPosters }}
          myLists={myLists}
          mySelectedListId={mySelectedListId}
        />
      </RoomShell>
    </ToastProvider>
  );
}
