// Filtri all'estrazione (Giorno 15): durata massima e generi, impostati
// dall'host su `rooms`. Condiviso tra il calcolo server-side del pool
// (room/[code]/page.tsx, che replica la logica della RPC draw_movie) e la UI
// dei filtri (draw-filters-panel.tsx).

import type { Genre } from "./types";

export const RUNTIME_FILTER_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Nessun limite", value: null },
  { label: "≤ 90 min", value: 90 },
  { label: "≤ 2h", value: 120 },
  { label: "≤ 2h30", value: 150 },
];

// Un film senza runtime passa comunque il filtro durata (falso positivo
// preferibile a nasconderlo). Array generi vuoto = nessun filtro genere.
export function passesDrawFilters(
  movie: { runtime: number | null; genres: Genre[] },
  maxRuntime: number | null,
  genreIds: number[],
): boolean {
  if (maxRuntime != null && movie.runtime != null && movie.runtime > maxRuntime) {
    return false;
  }
  if (genreIds.length > 0 && !movie.genres.some((g) => genreIds.includes(g.id))) {
    return false;
  }
  return true;
}
