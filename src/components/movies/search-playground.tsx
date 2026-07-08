"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { Movie, MovieSearchResult } from "@/lib/types";
import { SearchAutocomplete } from "./search-autocomplete";
import { MovieCard } from "./movie-card";

// Playground temporaneo (Giorno 3): valida ricerca → dettagli/upsert → griglia.
// Al Giorno 4 verrà sostituito dalla gestione delle liste.
export function SearchPlayground() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(sel: MovieSearchResult) {
    setError(null);
    if (movies.some((m) => m.tmdb_id === sel.tmdb_id)) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/tmdb/movie/${sel.tmdb_id}`);
      if (!res.ok) throw new Error();
      const { movie } = (await res.json()) as { movie: Movie };
      setMovies((prev) => [movie, ...prev]);
    } catch {
      setError("Non sono riuscito a caricare il film. Riprova.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchAutocomplete onSelect={handleSelect} />
        </div>
        {adding && <Loader2 className="size-5 animate-spin text-muted" />}
      </div>

      {error && <p className="mt-2 text-sm text-accent-red">{error}</p>}

      {movies.length > 0 ? (
        <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {movies.map((m) => (
            <MovieCard
              key={m.tmdb_id}
              title={m.title}
              year={m.release_year}
              poster={m.poster_path}
              rating={m.vote_average}
            />
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">
          Cerca un film qui sopra: apparirà nella griglia e verrà salvato nella
          cache.
        </p>
      )}
    </div>
  );
}
