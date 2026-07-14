import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { Movie } from "@/lib/types";
import { createClient, getUserCached } from "@/lib/supabase/server";
import { RoomShell } from "@/components/rooms/room-shell";
import { RoomStats, RoomStatsEmpty } from "@/components/rooms/room-stats";
import { computeRoomStats } from "@/lib/room-stats";

type RoomLookup = {
  id: string;
  code: string;
  name: string;
};

export function generateMetadata(): Metadata {
  return {
    title: "I vostri numeri · CineRoom",
    description: "Le statistiche della stanza: film visti, generi preferiti, voti e altro.",
  };
}

export default async function RoomStatsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  // Batch 1: lookup stanza per codice + utente corrente, indipendenti.
  const roomLookupPromise = createClient().then((sb) =>
    sb.rpc("get_room_by_code", { p_code: code }),
  );
  const [{ data: roomRows }, { supabase, user }] = await Promise.all([
    roomLookupPromise,
    getUserCached(),
  ]);
  const room = (roomRows as RoomLookup[] | null)?.[0] ?? null;

  if (!room) notFound();
  if (!user) {
    redirect(`/login?redirectedFrom=${encodeURIComponent(`/room/${room.code}/stats`)}`);
  }

  const { data: membership } = await supabase
    .from("room_members")
    .select("user_id")
    .eq("room_id", room.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) notFound();

  // Batch 2: tutte le query che dipendono solo da room.id, lanciate insieme
  // (pattern giorno 13).
  const [
    { data: memberRows },
    { data: exclRows },
    { data: ratingRows },
    { data: reactionRows },
    { data: sessionRows },
  ] = await Promise.all([
    supabase
      .from("room_members")
      .select("user_id, selected_list_id, joined_at, profiles(username, avatar_url)")
      .eq("room_id", room.id)
      .order("joined_at"),
    supabase
      .from("room_exclusions")
      .select("movie_id, excluded_at, movies(*)")
      .eq("room_id", room.id),
    supabase
      .from("movie_ratings")
      .select("movie_id, user_id, stars")
      .eq("room_id", room.id),
    supabase.from("movie_reactions").select("emoji").eq("room_id", room.id),
    supabase.from("swipe_sessions").select("id").eq("room_id", room.id),
  ]);

  const history = (exclRows ?? [])
    .map((r) => ({
      movie: r.movies as unknown as Movie,
      excludedAt: r.excluded_at as string,
    }))
    .filter((h) => !!h.movie);

  if (history.length === 0) {
    return (
      <RoomShell>
        <RoomStatsEmpty roomCode={room.code} roomName={room.name} />
      </RoomShell>
    );
  }

  const members = (memberRows ?? []).map((m) => {
    const profile = m.profiles as unknown as {
      username: string;
      avatar_url: string | null;
    } | null;
    return {
      userId: m.user_id as string,
      username: profile?.username ?? "utente",
      avatarUrl: profile?.avatar_url ?? null,
      selectedListId: m.selected_list_id as string | null,
      joinedAt: m.joined_at as string,
    };
  });

  const selectedListIds = members
    .map((m) => m.selectedListId)
    .filter((id): id is string => !!id);
  const historyMovieIds = history.map((h) => h.movie.tmdb_id);
  const sessionIds = (sessionRows ?? []).map((s) => s.id as string);

  // Batch 3: dipendono dai risultati del batch 2 (liste scelte, sessioni swipe).
  const [listMoviesResult, swipeVotesResult] = await Promise.all([
    selectedListIds.length > 0
      ? supabase
          .from("list_movies")
          .select("list_id, movie_id")
          .in("list_id", selectedListIds)
          .in("movie_id", historyMovieIds)
      : Promise.resolve({ data: null }),
    sessionIds.length > 0
      ? supabase
          .from("swipe_votes")
          .select("session_id, user_id, movie_id, liked")
          .in("session_id", sessionIds)
      : Promise.resolve({ data: null }),
  ]);

  const stats = computeRoomStats({
    members,
    history,
    ratings: (ratingRows ?? []) as { movie_id: number; user_id: string; stars: number }[],
    reactionEmojis: (reactionRows ?? []).map((r) => r.emoji as string),
    listMovies: (listMoviesResult.data ?? []) as { list_id: string; movie_id: number }[],
    swipeVotes: (swipeVotesResult.data ?? []) as {
      session_id: string;
      user_id: string;
      movie_id: number;
      liked: boolean;
    }[],
  });

  return (
    <RoomShell>
      <RoomStats roomCode={room.code} roomName={room.name} data={stats} />
    </RoomShell>
  );
}
