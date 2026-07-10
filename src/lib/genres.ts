// Generi film di TMDB (id ufficiali di /genre/movie/list), con etichetta
// italiana ed emoji. Statici di proposito: la lista cambia una volta ogni mai
// e così i chip delle categorie non costano un fetch.

export interface GenreOption {
  id: number;
  label: string;
  emoji: string;
}

export const MOVIE_GENRES: GenreOption[] = [
  { id: 28, label: "Azione", emoji: "💥" },
  { id: 12, label: "Avventura", emoji: "🗺️" },
  { id: 16, label: "Animazione", emoji: "🎨" },
  { id: 35, label: "Commedia", emoji: "😂" },
  { id: 80, label: "Crime", emoji: "🔫" },
  { id: 99, label: "Documentario", emoji: "🎥" },
  { id: 18, label: "Dramma", emoji: "🎭" },
  { id: 10751, label: "Famiglia", emoji: "👨‍👩‍👧" },
  { id: 14, label: "Fantasy", emoji: "🧙" },
  { id: 36, label: "Storia", emoji: "🏛️" },
  { id: 27, label: "Horror", emoji: "🎃" },
  { id: 10402, label: "Musica", emoji: "🎵" },
  { id: 9648, label: "Mistero", emoji: "🕵️" },
  { id: 10749, label: "Romantico", emoji: "💘" },
  { id: 878, label: "Fantascienza", emoji: "🚀" },
  { id: 10770, label: "Film TV", emoji: "📺" },
  { id: 53, label: "Thriller", emoji: "🔪" },
  { id: 10752, label: "Guerra", emoji: "⚔️" },
  { id: 37, label: "Western", emoji: "🤠" },
];

const BY_ID = new Map(MOVIE_GENRES.map((g) => [g.id, g]));

export function genreById(id: number): GenreOption | undefined {
  return BY_ID.get(id);
}

export function isValidGenreId(id: number): boolean {
  return BY_ID.has(id);
}
