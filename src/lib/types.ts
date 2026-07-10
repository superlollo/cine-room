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

// Consiglio TMDB per la stanza (Giorno 10): il film + il "seme" (film già
// visto in stanza) che lo ha prodotto, per la microcopy "Perché avete visto…".
export interface RoomRecommendation {
  movie: MovieSearchResult & { vote_average: number | null };
  reasonTitle: string;
  reasonStars: number | null;
}
