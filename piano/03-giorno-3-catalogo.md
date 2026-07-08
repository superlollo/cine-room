# Giorno 3 — Catalogo TMDB e ricerca con autocomplete

> Prerequisito: Giorni 1-2 completati. Leggere `00-OVERVIEW.md`. Serve una API key TMDB (gratuita: themoviedb.org → Settings → API). Se manca, chiederla prima di iniziare.

## Obiettivo

Ricerca film con autocomplete istantaneo (dropdown con poster mentre si digita) e cache locale dei film in tabella `movies`. Questo è il requisito "tanti film + completamento automatico".

## Task

### 1. Proxy TMDB server-side (la API key non deve MAI arrivare al client)
- [ ] `src/lib/tmdb.ts`: helper tipizzato per chiamare `https://api.themoviedb.org/3` con `language=it-IT` (fallback titoli inglesi gestito da TMDB) e mapping dei campi verso il tipo `Movie` di `lib/types.ts`.
- [ ] `app/api/tmdb/search/route.ts` — GET `?q=...`: chiama `/search/movie`, filtra risultati senza poster, ritorna max 8 risultati ordinati per popolarità: `{ tmdb_id, title, release_year, poster_path }`. Cache: `revalidate` 24h sulla fetch.
- [ ] `app/api/tmdb/movie/[id]/route.ts` — GET: dettagli completi (`/movie/{id}` con runtime e genres) e **upsert nella tabella `movies`** (client Supabase con service role, solo qui). Ritorna la riga. È la funzione da chiamare quando un film viene aggiunto a una lista.

### 2. Componente `SearchAutocomplete` (`components/movies/`)
- [ ] Input con icona lente; alla digitazione, **debounce 300ms**, fetch su `/api/tmdb/search`, dropdown sotto l'input.
- [ ] Ogni voce del dropdown: mini-poster (w92), titolo, anno. Evidenziare la parte del titolo che matcha la query.
- [ ] Navigazione tastiera completa: frecce ↑↓, Enter per selezionare, Esc per chiudere. Click fuori chiude.
- [ ] Stati: loading (skeleton righe nel dropdown), nessun risultato ("Nessun film trovato"), errore rete.
- [ ] Cancellare le richieste obsolete (AbortController) per evitare risultati fuori ordine.
- [ ] API del componente: prop `onSelect(movie)` — il chiamante decide cosa farne (Giorno 4: aggiunta a lista).

### 3. Componenti di presentazione film
- [ ] `MoviePoster`: immagine TMDB (`w342`) con `next/image` (configurare `image.tmdb.org` in `next.config`), placeholder blur/skeleton durante il load, fallback elegante per film senza poster.
- [ ] `MovieCard`: poster + titolo + anno + rating; hover con scale 1.05 + glow dell'accento (framer-motion). Sarà il mattone delle griglie.
- [ ] Pagina di prova temporanea `/home` (o una sezione) con il `SearchAutocomplete` montato e una griglia dei film selezionati, per validare tutto il flusso a occhio.

## Criteri di accettazione
- Digitando "inter" compaiono entro ~mezzo secondo suggerimenti con poster (Interstellar, Inception…), navigabili da tastiera.
- Selezionando un film, la chiamata a `/api/tmdb/movie/[id]` crea/aggiorna la riga in `movies` (verificare nel dashboard Supabase).
- La API key TMDB non compare in nessuna response né nel bundle client (cercare nel sorgente della pagina).
- Ricerca con 0 risultati e con rete lenta degradano con grazia (skeleton, messaggi).
