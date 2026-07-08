"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { Movie, MovieSearchResult } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Modal, Spinner, useToast } from "@/components/ui";
import {
  MovieCard,
  MovieDetailModal,
  SearchAutocomplete,
} from "@/components/movies";

export function ListDetail({
  list,
  isOwner,
  initialMovies,
}: {
  list: { id: string; name: string; emoji: string };
  isOwner: boolean;
  initialMovies: Movie[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  const [movies, setMovies] = useState<Movie[]>(initialMovies);
  const [name, setName] = useState(list.name);
  const [adding, setAdding] = useState(false);
  const [detailMovie, setDetailMovie] = useState<Movie | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(list.name);
  const [renaming, setRenaming] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function addMovie(sel: MovieSearchResult) {
    if (movies.some((m) => m.tmdb_id === sel.tmdb_id)) {
      toast.info("Film già presente nella lista.");
      return;
    }
    setAdding(true);
    try {
      // 1) upsert nella cache movies (necessario per la FK di list_movies)
      const res = await fetch(`/api/tmdb/movie/${sel.tmdb_id}`);
      if (!res.ok) throw new Error();
      const { movie } = (await res.json()) as { movie: Movie };
      // 2) collega alla lista
      const { error } = await supabase
        .from("list_movies")
        .insert({ list_id: list.id, movie_id: sel.tmdb_id });
      if (error) {
        if (error.code === "23505")
          toast.info("Film già presente nella lista.");
        else toast.error("Errore nell'aggiunta.");
        return;
      }
      setMovies((prev) => [movie, ...prev]);
      toast.success("Film aggiunto.");
      router.refresh();
    } catch {
      toast.error("Errore nell'aggiunta del film.");
    } finally {
      setAdding(false);
    }
  }

  async function removeMovie(tmdbId: number) {
    const prev = movies;
    setMovies((m) => m.filter((x) => x.tmdb_id !== tmdbId));
    const { error } = await supabase
      .from("list_movies")
      .delete()
      .eq("list_id", list.id)
      .eq("movie_id", tmdbId);
    if (error) {
      setMovies(prev);
      toast.error("Errore nella rimozione.");
    } else {
      router.refresh();
    }
  }

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    const next = renameValue.trim();
    if (!next) return;
    setRenaming(true);
    const { error } = await supabase
      .from("lists")
      .update({ name: next })
      .eq("id", list.id);
    setRenaming(false);
    if (error) {
      toast.error("Errore nella rinomina.");
      return;
    }
    setName(next);
    setRenameOpen(false);
    toast.success("Lista rinominata.");
    router.refresh();
  }

  async function deleteList() {
    setDeleting(true);
    const { error } = await supabase.from("lists").delete().eq("id", list.id);
    if (error) {
      setDeleting(false);
      toast.error("Errore nell'eliminazione.");
      return;
    }
    toast.success("Lista eliminata.");
    router.push("/home");
    router.refresh();
  }

  return (
    <div className="py-6">
      <Link
        href="/home"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Le tue liste
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{list.emoji}</span>
          <div>
            <h1 className="font-display text-2xl font-bold">{name}</h1>
            <p className="text-sm text-muted">
              {movies.length} film
            </p>
          </div>
        </div>

        {isOwner && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Opzioni lista"
              className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted transition hover:bg-white/10 hover:text-foreground"
            >
              <MoreVertical className="size-5" />
            </button>
            {menuOpen && (
              <>
                <button
                  aria-hidden
                  tabIndex={-1}
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-surface shadow-xl shadow-black/40">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setRenameValue(name);
                      setRenameOpen(true);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-white/5"
                  >
                    <Pencil className="size-4" /> Rinomina
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteOpen(true);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-accent-red transition hover:bg-accent-red/10"
                  >
                    <Trash2 className="size-4" /> Elimina lista
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Aggiunta film */}
      {isOwner && (
        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1">
            <SearchAutocomplete
              onSelect={addMovie}
              placeholder="Aggiungi un film alla lista…"
            />
          </div>
          {adding && <Spinner className="text-muted" />}
        </div>
      )}

      {/* Griglia film */}
      {movies.length > 0 ? (
        <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
          <AnimatePresence mode="popLayout">
            {movies.map((m) => (
              <motion.div
                key={m.tmdb_id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <MovieCard
                  title={m.title}
                  year={m.release_year}
                  poster={m.poster_path}
                  rating={m.vote_average}
                  onClick={() => setDetailMovie(m)}
                  onRemove={isOwner ? () => removeMovie(m.tmdb_id) : undefined}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <p className="mt-10 text-center text-sm text-muted">
          {isOwner
            ? "Cerca un film qui sopra per aggiungerlo alla lista."
            : "Questa lista è ancora vuota."}
        </p>
      )}

      {/* Modali */}
      <MovieDetailModal
        movie={detailMovie}
        onClose={() => setDetailMovie(null)}
      />

      <Modal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="Rinomina lista"
      >
        <form onSubmit={rename} className="space-y-4">
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
            maxLength={60}
          />
          <Button type="submit" disabled={renaming} className="w-full">
            {renaming && <Spinner />}
            {renaming ? "Salvataggio…" : "Salva"}
          </Button>
        </form>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Eliminare la lista?"
      >
        <p className="text-sm text-muted">
          &laquo;{name}&raquo; e tutti i suoi film verranno rimossi. L&apos;azione
          non è reversibile.
        </p>
        <div className="mt-6 flex gap-3">
          <Button
            variant="ghost"
            onClick={() => setDeleteOpen(false)}
            className="flex-1"
          >
            Annulla
          </Button>
          <Button
            variant="danger"
            onClick={deleteList}
            disabled={deleting}
            className="flex-1"
          >
            {deleting && <Spinner />}
            Elimina
          </Button>
        </div>
      </Modal>
    </div>
  );
}
