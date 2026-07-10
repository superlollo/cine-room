"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { discoverByGenres, getMovieDetails } from "@/lib/tmdb.server";
import { isValidGenreId } from "@/lib/genres";
import type { Genre } from "@/lib/types";

// Cap del mazzo: sessioni infinite = nessun match, la scarsità aiuta a decidere.
const DECK_MAX = 40;
const DECK_MIN = 5;
// Quando i suggerimenti sono attivi teniamo loro qualche slot anche se le liste
// da sole riempirebbero il mazzo: senza questo cap un pool grande li azzererebbe.
const LIST_CAP_WITH_SUGGESTIONS = 30;
const MAX_SUGGESTIONS = 20;

type Session = {
  id: string;
  room_id: string;
  created_by: string;
  status: string;
  genre_ids: number[];
  include_suggestions: boolean;
};

/**
 * Apre una sessione swipe nella stanza e ci mette dentro chi l'ha creata.
 * L'indice univoco `one_active_swipe_per_room` respinge la seconda sessione viva.
 */
export async function createSwipeSession(
  roomId: string,
): Promise<{ error: string } | { sessionId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non sei autenticato." };

  const { data, error } = await supabase
    .from("swipe_sessions")
    .insert({ room_id: roomId, created_by: user.id })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { error: "C'è già una sessione swipe attiva in questa stanza." };
    }
    return { error: "Errore nell'apertura della sessione." };
  }

  const { error: playerError } = await supabase
    .from("swipe_players")
    .insert({ session_id: data.id, user_id: user.id });
  if (playerError) return { error: "Errore nell'ingresso in sessione." };

  return { sessionId: data.id };
}

/**
 * Categorie e toggle suggerimenti: li tocca chiunque abbia premuto "Partecipo"
 * (non solo chi ha creato la sessione). La RLS su swipe_sessions resta
 * solo-creatore per proteggere status/deck; qui passiamo dalla RPC
 * `update_swipe_genres`, che verifica la riga in swipe_players lato server.
 */
export async function updateSwipeSetup(
  sessionId: string,
  genreIds: number[],
  includeSuggestions: boolean,
): Promise<{ error: string } | void> {
  if (!genreIds.every(isValidGenreId)) return { error: "Categoria non valida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_swipe_genres", {
    p_session_id: sessionId,
    p_genre_ids: genreIds,
    p_include_suggestions: includeSuggestions,
  });
  if (error) return { error: "Errore nel salvare le categorie." };
}

export async function joinSwipeSession(
  sessionId: string,
): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non sei autenticato." };

  const { error } = await supabase
    .from("swipe_players")
    .upsert({ session_id: sessionId, user_id: user.id }, { onConflict: "session_id,user_id" });
  if (error) return { error: "Errore nell'ingresso in sessione." };
}

/**
 * "Pronto!" (ri-toggleabile finché si è in setup). Auto-start: l'ultimo che si
 * dichiara pronto fa partire la sessione senza un click in più — scelto rispetto
 * al bottone "Si parte!" perché la RPC `start_swipe` è atomica (riga bloccata +
 * update condizionata su `status = 'setup'`), quindi due "Pronto" simultanei
 * producono comunque un solo avvio: il secondo riceve 'not_setup' e non fa nulla.
 */
export async function setSwipeReady(
  sessionId: string,
  ready: boolean,
): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non sei autenticato." };

  const { error } = await supabase
    .from("swipe_players")
    .update({ ready })
    .eq("session_id", sessionId)
    .eq("user_id", user.id);
  if (error) return { error: "Errore nel salvare lo stato." };
  if (!ready) return;

  const { data: players } = await supabase
    .from("swipe_players")
    .select("ready")
    .eq("session_id", sessionId);
  const all = players ?? [];
  if (all.length < 2 || all.some((p) => !p.ready)) return;

  return startSwipeSession(sessionId);
}

/** Annulla la sessione: libera la stanza per una nuova (indice univoco parziale). */
export async function cancelSwipeSession(
  sessionId: string,
): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("swipe_sessions")
    .update({ status: "ended" })
    .eq("id", sessionId);
  if (error) return { error: "Errore nell'annullare la sessione." };
}

/**
 * Costruisce il mazzo (liste dei membri + suggerimenti TMDB) e lo congela con
 * la RPC atomica: da lì in poi tutti swipano le stesse card nello stesso ordine.
 */
export async function startSwipeSession(
  sessionId: string,
): Promise<{ error: string } | void> {
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("swipe_sessions")
    .select("id, room_id, created_by, status, genre_ids, include_suggestions")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { error: "Sessione non trovata." };
  if (session.status !== "setup") return; // già avviata da un'altra corsa

  const deck = await buildDeck(supabase, session as Session);
  if (deck.length < DECK_MIN) {
    return {
      error: "Troppo pochi film per queste categorie, allargate i filtri.",
    };
  }

  const { data: outcome, error } = await supabase.rpc("start_swipe", {
    p_session_id: sessionId,
    p_deck: deck,
  });
  if (error) return { error: "Errore nell'avvio della sessione." };

  switch (outcome as string) {
    case "ok":
    case "not_setup": // qualcun altro ha già avviato: va bene così
      return;
    case "not_all_ready":
      return { error: "Non sono ancora tutti pronti." };
    case "too_few":
      return {
        error: "Troppo pochi film per queste categorie, allargate i filtri.",
      };
    default:
      return { error: "Errore nell'avvio della sessione." };
  }
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function buildDeck(
  supabase: SupabaseServerClient,
  session: Session,
): Promise<number[]> {
  const genreIds = session.genre_ids ?? [];

  // Stesso pool dell'estrazione: unione dedup delle liste scelte dai membri,
  // meno i film già visti in stanza. In più: filtro per categoria.
  const [{ data: memberRows }, { data: exclusionRows }] = await Promise.all([
    supabase
      .from("room_members")
      .select("selected_list_id")
      .eq("room_id", session.room_id),
    supabase
      .from("room_exclusions")
      .select("movie_id")
      .eq("room_id", session.room_id),
  ]);

  const seen = new Set<number>((exclusionRows ?? []).map((e) => e.movie_id as number));
  const listIds = (memberRows ?? [])
    .map((m) => m.selected_list_id as string | null)
    .filter((id): id is string => !!id);

  const fromLists: number[] = [];
  if (listIds.length > 0) {
    const { data: listMovies } = await supabase
      .from("list_movies")
      .select("movie_id, movies(genres)")
      .in("list_id", listIds);

    const added = new Set<number>();
    for (const row of listMovies ?? []) {
      const movieId = row.movie_id as number;
      if (seen.has(movieId) || added.has(movieId)) continue;
      const genres = (row.movies as unknown as { genres: Genre[] } | null)?.genres ?? [];
      if (genreIds.length > 0 && !genres.some((g) => genreIds.includes(g.id))) continue;
      added.add(movieId);
      fromLists.push(movieId);
    }
  }

  const listCap = session.include_suggestions ? LIST_CAP_WITH_SUGGESTIONS : DECK_MAX;
  const deck = seededShuffle(fromLists, session.id).slice(0, listCap);

  if (session.include_suggestions) {
    const room = new Set([...deck, ...seen]);
    const wanted = Math.min(MAX_SUGGESTIONS, DECK_MAX - deck.length);
    if (wanted > 0) {
      const candidates = (await discoverByGenres(genreIds, MAX_SUGGESTIONS + room.size))
        .filter((id) => !room.has(id))
        .slice(0, wanted);
      const cached = await cacheMovies(candidates);
      deck.push(...cached);
    }
  }

  return seededShuffle(deck, session.id).slice(0, DECK_MAX);
}

/**
 * Upsert dei suggerimenti nella cache `movies` (serve alle FK e alle card):
 * stessa logica di `/api/tmdb/movie/[id]`, admin client perché `movies` è
 * scrivibile solo dal service role. Un film che TMDB non restituisce viene
 * semplicemente saltato: il mazzo non deve fallire per una card.
 */
async function cacheMovies(tmdbIds: number[]): Promise<number[]> {
  if (tmdbIds.length === 0) return [];

  const details = await Promise.all(
    tmdbIds.map((id) => getMovieDetails(id).catch(() => null)),
  );
  const rows = details.filter((d): d is NonNullable<typeof d> => d !== null);
  if (rows.length === 0) return [];

  const admin = createAdminClient();
  const { error } = await admin.from("movies").upsert(rows, { onConflict: "tmdb_id" });
  if (error) return [];

  return rows.map((r) => r.tmdb_id);
}

/**
 * Mischia in modo deterministico a partire dall'id di sessione: il mazzo è
 * congelato, ma ogni sessione ha il suo ordine.
 */
function seededShuffle<T>(items: T[], seed: string): T[] {
  const rand = mulberry32(hashSeed(seed));
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
