import "server-only";
import type { Movie, MovieSearchResult } from "./types";

// Chiamate all'API TMDB. La chiave resta SOLO qui (server): mai nel client.
// TMDB_API_KEY può essere un Read Access Token v4 (JWT → header Bearer)
// oppure una chiave v3 (→ querystring api_key). Rileviamo automaticamente.

const BASE = "https://api.themoviedb.org/3";
const KEY = (process.env.TMDB_API_KEY ?? "").trim();
const IS_BEARER = KEY.startsWith("eyJ") || KEY.split(".").length === 3;
const DAY = 60 * 60 * 24;

interface TmdbSearchItem {
  id: number;
  title: string;
  release_date?: string;
  poster_path: string | null;
  popularity?: number;
}

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbMovieDetails {
  id: number;
  title: string;
  original_title?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  overview?: string;
  runtime?: number | null;
  genres?: TmdbGenre[];
  vote_average?: number;
}

function yearOf(date?: string | null): number | null {
  if (!date) return null;
  const y = parseInt(date.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

async function tmdbFetch<T>(
  path: string,
  params: Record<string, string> = {},
  revalidate = DAY,
): Promise<T> {
  const url = new URL(BASE + path);
  url.searchParams.set("language", "it-IT");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const headers: Record<string, string> = { accept: "application/json" };
  if (IS_BEARER) headers.Authorization = `Bearer ${KEY}`;
  else url.searchParams.set("api_key", KEY);

  const res = await fetch(url, { headers, next: { revalidate } });
  if (!res.ok) throw new Error(`TMDB ${res.status} su ${path}`);
  return res.json() as Promise<T>;
}

/**
 * Ricerca film per l'autocomplete: max 8, con poster, ordinati per popolarità.
 *
 * TMDB ordina /search/movie per rilevanza testuale: per query "corte e comuni"
 * (es. "inter") i titoli molto popolari finiscono oltre la prima pagina. Per
 * questo raccogliamo le prime 3 pagine e riordiniamo per popolarità, così i
 * film noti emergono. Gli errori di pagina 1 propagano (→ 502 nel route);
 * quelli delle pagine 2-3 sono tollerati.
 */
export async function searchMovies(query: string): Promise<MovieSearchResult[]> {
  const search = (page: number) =>
    tmdbFetch<{ results: TmdbSearchItem[] }>("/search/movie", {
      query,
      include_adult: "false",
      page: String(page),
    });

  const [p1, p2, p3] = await Promise.all([
    search(1),
    search(2).catch(() => ({ results: [] as TmdbSearchItem[] })),
    search(3).catch(() => ({ results: [] as TmdbSearchItem[] })),
  ]);

  const seen = new Set<number>();
  const merged: TmdbSearchItem[] = [];
  for (const item of [...p1.results, ...p2.results, ...p3.results]) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }

  return merged
    .filter((r) => r.poster_path)
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, 8)
    .map((r) => ({
      tmdb_id: r.id,
      title: r.title,
      release_year: yearOf(r.release_date),
      poster_path: r.poster_path,
    }));
}

/** Poster di film popolari, per la parete decorativa della landing. */
export async function getPopularPosters(limit = 20): Promise<string[]> {
  try {
    const data = await tmdbFetch<{ results: TmdbSearchItem[] }>(
      "/movie/popular",
      { page: "1" },
    );
    return data.results
      .map((r) => r.poster_path)
      .filter((p): p is string => !!p)
      .slice(0, limit);
  } catch {
    return [];
  }
}

/** Dettagli completi di un film, mappati sulle colonne della tabella `movies`. */
export async function getMovieDetails(
  id: number,
): Promise<Omit<Movie, "created_at">> {
  const d = await tmdbFetch<TmdbMovieDetails>(`/movie/${id}`);
  return {
    tmdb_id: d.id,
    title: d.title,
    original_title: d.original_title ?? null,
    poster_path: d.poster_path ?? null,
    backdrop_path: d.backdrop_path ?? null,
    release_year: yearOf(d.release_date),
    overview: d.overview ?? null,
    runtime: d.runtime ?? null,
    genres: (d.genres ?? []).map((g) => ({ id: g.id, name: g.name })),
    vote_average: d.vote_average ?? null,
  };
}
