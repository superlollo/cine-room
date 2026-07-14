// Tipi condivisi dell'app. Rispecchiano lo schema DB del §3 dell'overview.

export type RoomStatus = "open" | "drawing" | "decided";

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Genre {
  id: number;
  name: string;
}

// Un provider su cui il film è disponibile (Giorno 16), regione IT.
export interface WatchProviderItem {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

// Solo la regione IT già estratta dalla risposta TMDB, non l'intero payload
// (che copre tutte le regioni).
export interface WatchProviders {
  flatrate: WatchProviderItem[];
  rent: WatchProviderItem[];
  buy: WatchProviderItem[];
}

export interface Movie {
  tmdb_id: number;
  title: string;
  original_title: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_year: number | null;
  overview: string | null;
  runtime: number | null;
  genres: Genre[];
  vote_average: number | null;
  // "Dove guardarlo" (Giorno 16): null = provider mai fetchati (diverso da
  // "non disponibile in streaming"). Refresh oltre 7 giorni da questa data.
  watch_providers: WatchProviders | null;
  providers_fetched_at: string | null;
  created_at: string;
}

export interface List {
  id: string;
  owner_id: string;
  name: string;
  emoji: string;
  created_at: string;
}

// Risultato "leggero" dell'autocomplete (client-safe).
export interface MovieSearchResult {
  tmdb_id: number;
  title: string;
  release_year: number | null;
  poster_path: string | null;
}

export interface ListMovie {
  list_id: string;
  movie_id: number;
  added_at: string;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  host_id: string;
  current_movie_id: number | null;
  status: RoomStatus;
  // Filtri estrazione (Giorno 15): impostati dall'host, valgono per il
  // cilindro classico. null = nessun limite durata; array vuoto = nessun
  // filtro genere.
  filter_max_runtime: number | null;
  filter_genre_ids: number[];
  // Piattaforme possedute dalla stanza (Giorno 16): provider_id TMDB. Array
  // vuoto = filtro piattaforme spento.
  platform_ids: number[];
  created_at: string;
}

export interface RoomMember {
  room_id: string;
  user_id: string;
  // Ogni partecipante sceglie UNA sua lista; l'estrazione pesca dall'unione
  // (dedup) delle liste scelte dai membri, al netto delle esclusioni stanza.
  selected_list_id: string | null;
  joined_at: string;
}

export interface RoomExclusion {
  room_id: string;
  movie_id: number;
  excluded_at: string;
}

export interface MovieRating {
  room_id: string;
  movie_id: number;
  user_id: string;
  stars: number;
  updated_at: string;
}

export interface MovieReaction {
  room_id: string;
  movie_id: number;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface MovieComment {
  id: string;
  room_id: string;
  movie_id: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  body: string;
  created_at: string;
}

// Feedback (voti/reazioni/commenti) raggruppato per film, per una stanza.
export interface MovieFeedback {
  ratings: MovieRating[];
  reactions: MovieReaction[];
  comments: MovieComment[];
}

// Tinder-mode (Giorno 11): sessione di swipe dentro una stanza.
export type SwipeStatus = "setup" | "swiping" | "matched" | "ended";

export interface SwipeSession {
  id: string;
  room_id: string;
  created_by: string;
  status: SwipeStatus;
  genre_ids: number[];
  include_suggestions: boolean;
  deck: number[];
  matched_movie_id: number | null;
  // Una sessione conclusa resta a schermo (esito match / nessun match) finché
  // non viene archiviata: è `archived`, non `status`, a liberare la stanza.
  archived: boolean;
  created_at: string;
}

// Riga di swipe_players arricchita col profilo, per la lobby.
export interface SwipePlayer {
  session_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  ready: boolean;
  finished: boolean;
  joined_at: string;
}

// Voto su una card del mazzo (Giorno 12). Il `liked` altrui non viene mai
// mostrato in UI durante la sessione: serve ai contatori e ai quasi-match.
export interface SwipeVote {
  user_id: string;
  movie_id: number;
  liked: boolean;
}

// Consiglio TMDB per la stanza (Giorno 10): il film + il "seme" (film già
// visto in stanza) che lo ha prodotto, per la microcopy "Perché avete visto…".
export interface RoomRecommendation {
  movie: MovieSearchResult & { vote_average: number | null };
  reasonTitle: string;
  reasonStars: number | null;
}
