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
  selected_list_id: string | null;
  current_movie_id: number | null;
  status: RoomStatus;
  created_at: string;
}

export interface RoomMember {
  room_id: string;
  user_id: string;
  joined_at: string;
}

export interface RoomExclusion {
  room_id: string;
  movie_id: number;
  excluded_at: string;
}
