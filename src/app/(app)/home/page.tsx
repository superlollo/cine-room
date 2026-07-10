import { redirect } from "next/navigation";
import { Film } from "lucide-react";
import type { RoomStatus } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { ListCard } from "@/components/lists/list-card";
import { NewListLauncher } from "@/components/lists/new-list-launcher";
import { RoomCard } from "@/components/rooms/room-card";
import { CreateRoomLauncher } from "@/components/rooms/create-room-launcher";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lists } = await supabase
    .from("lists")
    .select("id, name, emoji")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  // Conteggio film + poster di anteprima per ogni lista (una query sola).
  const ids = (lists ?? []).map((l) => l.id);
  const preview: Record<string, { count: number; posters: string[] }> = {};
  if (ids.length > 0) {
    const { data: rows } = await supabase
      .from("list_movies")
      .select("list_id, added_at, movies(poster_path)")
      .in("list_id", ids)
      .order("added_at", { ascending: false });
    for (const row of rows ?? []) {
      const bucket = (preview[row.list_id] ??= { count: 0, posters: [] });
      bucket.count += 1;
      const poster = (
        row.movies as unknown as { poster_path: string | null } | null
      )?.poster_path;
      if (poster && bucket.posters.length < 4) bucket.posters.push(poster);
    }
  }

  const hasLists = (lists ?? []).length > 0;

  // Stanze di cui l'utente è membro + conteggio membri.
  const { data: memberships } = await supabase
    .from("room_members")
    .select("room_id, rooms(id, code, name, status, host_id, created_at)")
    .eq("user_id", user.id);

  type RoomRow = {
    id: string;
    code: string;
    name: string;
    status: RoomStatus;
    host_id: string;
    created_at: string;
  };
  const rooms = (memberships ?? [])
    .map((m) => m.rooms as unknown as RoomRow | null)
    .filter((r): r is RoomRow => !!r)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const memberCounts: Record<string, number> = {};
  const swipingRooms = new Set<string>();
  if (rooms.length > 0) {
    const roomIds = rooms.map((r) => r.id);
    const [{ data: allMembers }, { data: swipeRows }] = await Promise.all([
      supabase.from("room_members").select("room_id").in("room_id", roomIds),
      supabase
        .from("swipe_sessions")
        .select("room_id")
        .in("room_id", roomIds)
        .in("status", ["setup", "swiping"]),
    ]);
    for (const row of allMembers ?? [])
      memberCounts[row.room_id] = (memberCounts[row.room_id] ?? 0) + 1;
    for (const row of swipeRows ?? []) swipingRooms.add(row.room_id);
  }

  const hasRooms = rooms.length > 0;

  return (
    <div className="space-y-12 py-6">
      {/* Le tue liste */}
      <section>
        <h1 className="font-display text-2xl font-bold">Le tue liste</h1>
        <p className="mt-1 text-sm text-muted">
          Raccogli i film che vuoi vedere.
        </p>

        {hasLists ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {(lists ?? []).map((l) => (
              <ListCard
                key={l.id}
                id={l.id}
                name={l.name}
                emoji={l.emoji}
                count={preview[l.id]?.count ?? 0}
                posters={preview[l.id]?.posters ?? []}
              />
            ))}
            <NewListLauncher userId={user.id} variant="card" />
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] py-16 text-center">
            <span className="bg-accent-gradient flex size-14 items-center justify-center rounded-2xl shadow-lg shadow-accent-red/30">
              <Film className="size-7 text-black" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold">
                Ancora nessuna lista
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                Crea una lista, riempila di film e poi aprila in una stanza per
                decidere insieme cosa guardare.
              </p>
            </div>
            <NewListLauncher userId={user.id} variant="cta" />
          </div>
        )}
      </section>

      {/* Le tue stanze */}
      <section>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Le tue stanze</h2>
            <p className="mt-1 text-sm text-muted">
              Inviti gli amici e decidete insieme.
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-3">
            {hasRooms && <CreateRoomLauncher variant="cta" />}
          </div>
        </div>

        {hasRooms ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((r) => (
              <RoomCard
                key={r.id}
                code={r.code}
                name={r.name}
                status={r.status}
                members={memberCounts[r.id] ?? 1}
                isHost={r.host_id === user.id}
                swiping={swipingRooms.has(r.id)}
              />
            ))}
            <CreateRoomLauncher variant="card" />
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] py-14 text-center">
            <p className="max-w-sm text-sm text-muted">
              Crea una stanza, condividi il link e lascia che ognuno scelga la
              propria lista: CineRoom pescherà un film per tutti.
            </p>
            <CreateRoomLauncher variant="cta" />
          </div>
        )}
      </section>
    </div>
  );
}
