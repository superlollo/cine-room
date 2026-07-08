// Helper TMDB (chiamate server-side). Implementazione completa al Giorno 3.
//
// La TMDB_API_KEY resta server-side: le chiamate dal client passano dai
// route handler in app/api/tmdb/*.

export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

/** URL di un poster TMDB alla dimensione richiesta (default w342). */
export function posterUrl(
  path: string | null | undefined,
  size: "w92" | "w185" | "w342" | "w500" | "original" = "w342",
): string | null {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}

/** URL di un backdrop TMDB (default w1280). */
export function backdropUrl(
  path: string | null | undefined,
  size: "w780" | "w1280" | "original" = "w1280",
): string | null {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}
