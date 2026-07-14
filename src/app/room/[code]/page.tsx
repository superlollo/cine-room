import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type {
  Genre,
  Movie,
  MovieFeedback,
  RoomStatus,
  SwipePlayer,
  SwipeSession,
  SwipeVote,
  WatchProviders,
} from "@/lib/types";
import { createClient, getUserCached } from "@/lib/supabase/server";
import { ToastProvider } from "@/components/ui";
import { RoomShell } from "@/components/rooms/room-shell";
import { RoomInvite } from "@/components/rooms/room-invite";
import { JoinRoom } from "@/components/rooms/join-room";
import { RoomView } from "@/components/rooms/room-view";
import { passesDrawFilters } from "@/lib/draw-filters";

type RoomLookup = {
  id: string;
  code: string;
  name: string;
  host_id: string;
  status: string;
  current_movie_id: number | null;
  filter_max_runtime: number | null;
  filter_genre_ids: number[];
  platform_ids: number[];
};

// Anteprima social generica: il link viene condiviso su WhatsApp, ma non
// esponiamo nome stanza/host nell'OG (solo branding + invito).
export function generateMetadata(): Metadata {
  return {
    title: "Entra nella stanza · CineRoom",
    description:
      "Ti hanno invitato in una sala CineRoom: entra, scegli una tua lista e lasciate che l'app scelga il film per tutti.",
  };
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  // Batch 1: lookup stanza per codice (RPC SECURITY DEFINER, funziona anche
  // per i non membri) e utente corrente — due chiamate di rete indipendenti.
  const roomLookupPromise = createClient().then((sb) =>
    sb.rpc("get_room_by_code", { p_code: code }),
  );
  const [{ data: roomRows }, { supabase, user }] = await Promise.all([
    roomLookupPromise,
    getUserCached(),
  ]);
  const room = (roomRows as RoomLookup[] | null)?.[0] ?? null;

  if (!room) notFound();

  // Batch 2: profilo host (serve a entrambi i casi "non membro") + membership
  // — indipendenti tra loro, dipendono solo da room.host_id / room.id+user.id.
  const [{ data: hostProfile }, membershipResult] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", room.host_id).single(),
    user
      ? supabase
          .from("room_members")
          .select("user_id")
          .eq("room_id", room.id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const hostName = hostProfile?.username ?? "qualcuno";

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
  const membership = membershipResult.data;

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
  // Batch 3: tutte le query che dipendono solo da room.id / user.id (ora
  // entrambi noti), lanciate insieme.
  function bucket(
    feedbackByMovie: Record<number, MovieFeedback>,
    movieId: number,
  ): MovieFeedback {
    return (feedbackByMovie[movieId] ??= {
      ratings: [],
      reactions: [],
      comments: [],
    });
  }

  const [
    { data: memberRows },
    { data: exclRows },
    { data: poolExclRows },
    { data: ratingRows },
    { data: reactionRows },
    { data: commentRows },
    { data: sessionRow },
    { data: myListRows },
    currentMovieResult,
  ] = await Promise.all([
    supabase
      .from("room_members")
      .select(
        "user_id, selected_list_id, joined_at, profiles(username, avatar_url), lists(id, name, emoji)",
      )
      .eq("room_id", room.id)
      .order("joined_at"),
    // Cronologia: film già estratti/bruciati in questa stanza
    supabase
      .from("room_exclusions")
      .select("excluded_at, movies(*)")
      .eq("room_id", room.id)
      .order("excluded_at", { ascending: false }),
    // Set di esclusioni per il filtro del pool (batch 4)
    supabase.from("room_exclusions").select("movie_id").eq("room_id", room.id),
    supabase
      .from("movie_ratings")
      .select("room_id, movie_id, user_id, stars, updated_at")
      .eq("room_id", room.id),
    supabase
      .from("movie_reactions")
      .select("room_id, movie_id, user_id, emoji, created_at")
      .eq("room_id", room.id),
    supabase
      .from("movie_comments")
      .select(
        "id, room_id, movie_id, user_id, body, created_at, profiles(username, avatar_url)",
      )
      .eq("room_id", room.id)
      .order("created_at"),
    // Sessione swipe non archiviata: al massimo una per stanza (indice
    // univoco). Comprende quelle già concluse, la cui schermata di esito è
    // ancora a schermo.
    supabase
      .from("swipe_sessions")
      .select("*")
      .eq("room_id", room.id)
      .eq("archived", false)
      .maybeSingle(),
    // Le liste dell'utente corrente (per il selettore)
    supabase
      .from("lists")
      .select("id, name, emoji")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    // Film attualmente estratto (se presente) — dipende solo da room, non da
    // membership, quindi può partire in questo stesso batch.
    room.current_movie_id
      ? supabase
          .from("movies")
          .select("*")
          .eq("tmdb_id", room.current_movie_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const currentMovie = (currentMovieResult.data as Movie | null) ?? null;

  const history = (exclRows ?? [])
    .map((r) => ({
      movie: r.movies as unknown as Movie,
      excludedAt: r.excluded_at as string,
    }))
    .filter((h) => !!h.movie);

  // Feedback (voti/reazioni/commenti) sui film visti in questa stanza,
  // raggruppati per movie_id per essere passati a cronologia e "Film della serata".
  const feedbackByMovie: Record<number, MovieFeedback> = {};
  for (const r of ratingRows ?? []) bucket(feedbackByMovie, r.movie_id).ratings.push(r);
  for (const r of reactionRows ?? []) bucket(feedbackByMovie, r.movie_id).reactions.push(r);
  for (const c of commentRows ?? []) {
    const profile = c.profiles as unknown as {
      username: string;
      avatar_url: string | null;
    } | null;
    bucket(feedbackByMovie, c.movie_id).comments.push({
      id: c.id,
      room_id: c.room_id,
      movie_id: c.movie_id,
      user_id: c.user_id,
      username: profile?.username ?? "utente",
      avatar_url: profile?.avatar_url ?? null,
      body: c.body,
      created_at: c.created_at,
    });
  }

  const swipeSession = (sessionRow as SwipeSession | null) ?? null;

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
  const myListIds = (myListRows ?? []).map((l) => l.id);

  // Batch 4: dipendono dai risultati del batch 3 (liste scelte dai membri,
  // mie liste, sessione swipe) — lanciate tutte insieme.
  const [
    poolListMoviesResult,
    myListMoviesResult,
    swipePlayersResult,
    swipeDeckResult,
    swipeVotesResult,
  ] = await Promise.all([
    selectedListIds.length > 0
      ? supabase
          .from("list_movies")
          .select("movie_id, movies(poster_path, runtime, genres, watch_providers)")
          .in("list_id", selectedListIds)
      : Promise.resolve({ data: null }),
    myListIds.length > 0
      ? supabase.from("list_movies").select("list_id").in("list_id", myListIds)
      : Promise.resolve({ data: null }),
    swipeSession
      ? supabase
          .from("swipe_players")
          .select(
            "session_id, user_id, ready, finished, joined_at, profiles(username, avatar_url)",
          )
          .eq("session_id", swipeSession.id)
          .order("joined_at")
      : Promise.resolve({ data: null }),
    swipeSession && swipeSession.deck.length > 0
      ? supabase.from("movies").select("*").in("tmdb_id", swipeSession.deck)
      : Promise.resolve({ data: null }),
    swipeSession && swipeSession.deck.length > 0
      ? supabase
          .from("swipe_votes")
          .select("user_id, movie_id, liked")
          .eq("session_id", swipeSession.id)
      : Promise.resolve({ data: null }),
  ]);

  // poolCountUnfiltered = pool al netto delle sole esclusioni (come prima del
  // Giorno 15); poolCount applica anche i filtri estrazione, con la stessa
  // logica replicata nella RPC draw_movie (vedi lib/draw-filters.ts).
  let poolCount = 0;
  let poolCountUnfiltered = 0;
  let poolPosters: string[] = [];
  if (selectedListIds.length > 0) {
    const exclSet = new Set((poolExclRows ?? []).map((e) => e.movie_id));
    const uniq = new Map<
      number,
      {
        poster: string | null;
        runtime: number | null;
        genres: Genre[];
        watch_providers: WatchProviders | null;
      }
    >();
    for (const row of poolListMoviesResult.data ?? []) {
      if (exclSet.has(row.movie_id)) continue;
      if (!uniq.has(row.movie_id)) {
        const m = row.movies as unknown as {
          poster_path: string | null;
          runtime: number | null;
          genres: Genre[] | null;
          watch_providers: WatchProviders | null;
        } | null;
        uniq.set(row.movie_id, {
          poster: m?.poster_path ?? null,
          runtime: m?.runtime ?? null,
          genres: m?.genres ?? [],
          watch_providers: m?.watch_providers ?? null,
        });
      }
    }
    poolCountUnfiltered = uniq.size;
    const filtered = [...uniq.values()].filter((m) =>
      passesDrawFilters(
        m,
        room.filter_max_runtime,
        room.filter_genre_ids,
        room.platform_ids,
      ),
    );
    poolCount = filtered.length;
    poolPosters = filtered
      .map((m) => m.poster)
      .filter((p): p is string => !!p)
      .slice(0, 30);
  }

  // Conteggio film per ogni mia lista (per il selettore)
  const myCounts: Record<string, number> = {};
  for (const row of myListMoviesResult.data ?? [])
    myCounts[row.list_id] = (myCounts[row.list_id] ?? 0) + 1;
  const myLists = (myListRows ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    emoji: l.emoji,
    count: myCounts[l.id] ?? 0,
  }));

  const mySelectedListId =
    members.find((m) => m.userId === user.id)?.selectedList?.id ?? null;

  const swipePlayers: SwipePlayer[] = (swipePlayersResult.data ?? []).map(
    (p) => {
      const profile = p.profiles as unknown as {
        username: string;
        avatar_url: string | null;
      } | null;
      return {
        session_id: p.session_id,
        user_id: p.user_id,
        username: profile?.username ?? "utente",
        avatar_url: profile?.avatar_url ?? null,
        ready: p.ready,
        finished: p.finished,
        joined_at: p.joined_at,
      };
    },
  );

  // Mazzo congelato + voti già espressi (Giorno 12). Il mazzo è vuoto in
  // `setup`: si popola all'avvio. I voti sono la fonte di verità del punto in
  // cui ognuno è arrivato, così un refresh riprende dalla card giusta.
  let swipeDeck: Movie[] = [];
  let swipeVotes: SwipeVote[] = [];
  if (swipeSession && swipeSession.deck.length > 0) {
    const byId = new Map(
      (swipeDeckResult.data ?? []).map((m) => [m.tmdb_id as number, m as Movie]),
    );
    swipeDeck = swipeSession.deck
      .map((id) => byId.get(id))
      .filter((m): m is Movie => !!m);
    swipeVotes = (swipeVotesResult.data ?? []) as SwipeVote[];
  }

  return (
    <ToastProvider>
      <RoomShell>
        <RoomView
          room={{
            id: room.id,
            code: room.code,
            name: room.name,
            status: room.status as RoomStatus,
            filterMaxRuntime: room.filter_max_runtime,
            filterGenreIds: room.filter_genre_ids,
            filterPlatformIds: room.platform_ids,
          }}
          currentUserId={user.id}
          isHost={room.host_id === user.id}
          members={members}
          pool={{ count: poolCount, posters: poolPosters }}
          poolCountUnfiltered={poolCountUnfiltered}
          myLists={myLists}
          mySelectedListId={mySelectedListId}
          currentMovie={currentMovie}
          history={history}
          feedbackByMovie={feedbackByMovie}
          swipeSession={swipeSession}
          swipePlayers={swipePlayers}
          swipeDeck={swipeDeck}
          swipeVotes={swipeVotes}
        />
      </RoomShell>
    </ToastProvider>
  );
}
