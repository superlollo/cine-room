# Giorno 4 — Liste e homepage

> Prerequisito: Giorni 1-3 completati. Leggere `00-OVERVIEW.md`.

## Obiettivo

CRUD completo delle liste "da vedere", aggiunta/rimozione film con l'autocomplete del Giorno 3, e la vera homepage.

## Task

### 1. Homepage — `(app)/home/page.tsx`
- [ ] Due sezioni: **"Le tue liste"** e **"Le tue stanze"** (le stanze restano placeholder fino al Giorno 5, ma prevedere lo spazio e la CTA "Crea stanza" disabilitata o nascosta).
- [ ] Griglia di card lista: emoji + nome + conteggio film + collage dei primi 3-4 poster (effetto "pila"/fan di poster, è il dettaglio premium della pagina). Card "+ Nuova lista" in coda alla griglia.
- [ ] Creazione lista da modal: nome + selettore emoji (set predefinito). Insert su `lists`.
- [ ] Empty state curato per chi non ha liste: illustrazione/gradiente, copy invitante, CTA grande.

### 2. Dettaglio lista — `(app)/lists/[id]/page.tsx`
- [ ] Header: emoji, nome (editabile inline), conteggio, menu ⋯ con "Rinomina" ed "Elimina lista" (conferma in modal; l'eliminazione cascata su `list_movies` è già gestita dal DB).
- [ ] `SearchAutocomplete` in evidenza in alto: `onSelect` → chiama `/api/tmdb/movie/[id]` (upsert in `movies`) → insert in `list_movies` → il film appare nella griglia con animazione di ingresso (stagger framer-motion).
- [ ] Se il film è già nella lista: feedback "già presente" (toast), niente duplicati (la PK composta lo garantisce, ma gestire l'errore con grazia).
- [ ] Griglia di `MovieCard` con hover che rivela il bottone rimuovi (X). Rimozione ottimistica con rollback su errore.
- [ ] Click su una card → modal/drawer dettaglio film: backdrop sfocato come sfondo, poster, trama, durata, generi, rating.

### 3. Dati e sicurezza
- [ ] Fetch delle liste server-side (server component) con il client Supabase di `server.ts`; mutazioni client-side o server actions, a scelta ma coerenti.
- [ ] Verificare le RLS: un utente NON deve poter leggere/modificare le liste di un altro (test manuale con due account nei due browser).
- [ ] Toast di conferma/errore riutilizzabile (`components/ui/Toast`) per tutte le mutazioni.

## Criteri di accettazione
- Creo la lista "Serata horror 🎃", cerco "The Shining" con l'autocomplete, lo aggiungo: appare nella griglia e il conteggio si aggiorna; dopo refresh è ancora lì.
- Il collage di poster della card lista in homepage riflette i film reali della lista.
- Rimozione film e eliminazione lista funzionano con conferma; con il secondo account non vedo né raggiungo (via URL diretto) le liste del primo.
- Tutto usabile e bello su mobile 375px.
