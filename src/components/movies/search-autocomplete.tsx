"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { MovieSearchResult } from "@/lib/types";
import { posterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

export function SearchAutocomplete({
  onSelect,
  placeholder = "Cerca un film…",
}: {
  onSelect: (movie: MovieSearchResult) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MovieSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset/attivazione UI immediati sulla digitazione (fuori dall'effect).
  function handleChange(value: string) {
    setQuery(value);
    const q = value.trim();
    if (q.length < 2) {
      abortRef.current?.abort();
      setResults([]);
      setError(false);
      setLoading(false);
      setOpen(false);
    } else {
      setLoading(true);
      setError(false);
      setOpen(true);
    }
  }

  // Debounce 300ms + fetch con annullamento delle richieste obsolete.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("bad_status");
        const data: { results?: MovieSearchResult[] } = await res.json();
        setResults(data.results ?? []);
        setHighlight(0);
        setOpen(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError(true);
          setResults([]);
          setOpen(true);
        }
      } finally {
        if (abortRef.current === ctrl) setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Click fuori → chiude.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function choose(movie: MovieSearchResult) {
    onSelect(movie);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open && results.length) setOpen(true);
      setHighlight((h) => (results.length ? (h + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) =>
        results.length ? (h - 1 + results.length) % results.length : 0,
      );
    } else if (e.key === "Enter") {
      const movie = results[highlight];
      if (open && movie) {
        e.preventDefault();
        choose(movie);
      }
    }
  }

  const q = query.trim();
  const showDropdown = open && q.length >= 2;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => q.length >= 2 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="movie-search-listbox"
          aria-autocomplete="list"
          className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-foreground backdrop-blur outline-none transition placeholder:text-muted focus:border-accent-gold/50 focus:ring-2 focus:ring-accent-gold/30"
        />
      </div>

      {showDropdown && (
        <div
          id="movie-search-listbox"
          role="listbox"
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-surface/95 shadow-2xl shadow-black/50 backdrop-blur"
        >
          {loading ? (
            <ul className="p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 p-2">
                  <div className="h-14 w-10 shrink-0 animate-pulse rounded-md bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
                    <div className="h-2.5 w-12 animate-pulse rounded bg-white/10" />
                  </div>
                </li>
              ))}
            </ul>
          ) : error ? (
            <p className="p-4 text-center text-sm text-muted">
              Errore di rete. Riprova.
            </p>
          ) : results.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted">
              Nessun film trovato.
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto p-2">
              {results.map((movie, i) => {
                const thumb = posterUrl(movie.poster_path, "w92");
                return (
                  <li key={movie.tmdb_id} role="option" aria-selected={i === highlight}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => choose(movie)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl p-2 text-left transition",
                        i === highlight ? "bg-white/10" : "hover:bg-white/5",
                      )}
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="h-14 w-10 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="h-14 w-10 shrink-0 rounded-md bg-surface-2" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          <Highlighted text={movie.title} q={q} />
                        </span>
                        {movie.release_year && (
                          <span className="block text-xs text-muted">
                            {movie.release_year}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Evidenzia la porzione di titolo che combacia con la query.
function Highlighted({ text, q }: { text: string; q: string }) {
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (!q || idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-accent-gold">{text.slice(idx, idx + q.length)}</span>
      {text.slice(idx + q.length)}
    </>
  );
}
