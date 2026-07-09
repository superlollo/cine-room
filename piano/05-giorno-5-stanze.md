# Giorno 5 — Stanze (sale cinema), link di condivisione e lobby realtime

> Prerequisito: Giorni 1-4 completati. Leggere `00-OVERVIEW.md`.

## Obiettivo

Creare stanze, entrarci tramite link condiviso, vedere i membri in tempo reale e far scegliere a **ogni partecipante una sua lista** (il pool di estrazione è l'unione delle liste scelte).

## Task

### 1. Creazione stanza
- [ ] Dalla homepage, CTA "Crea stanza": modal con nome stanza (default "Serata film 🍿").
- [ ] Insert su `rooms` con `code` generato server-side: 6 caratteri alfanumerici maiuscoli non ambigui (no 0/O/1/I), retry su collisione. Host inserito anche in `room_members`.
- [ ] Redirect a `/room/[code]`.
- [ ] In homepage, sezione "Le tue stanze": card delle stanze di cui si è membri (nome, n° membri, stato, ultima attività) con link.

### 2. Join tramite link — `/room/[code]`
- [ ] La pagina è raggiungibile da chiunque abbia il link. Tre casi:
  - **Non loggato** → schermata invito: nome stanza, host, "Accedi o registrati per entrare"; dopo l'auth si torna QUI (usare `redirectTo`/param `next`).
  - **Loggato, non membro** → schermata "Ti hanno invitato in {nome}" con bottone "Entra" → insert in `room_members` (con `selected_list_id` null: sceglierà la lista in lobby).
  - **Membro** → lobby (sotto).
- [ ] Serve una policy RLS che consenta il SELECT su `rooms` per `code` anche ai non membri (solo campi necessari: nome, host, status). Se al Giorno 1 non era prevista, aggiungerla con una migration.

### 3. Lobby della stanza
- [ ] Header: nome stanza, codice, bottone **"Copia link invito"** (clipboard + toast "Link copiato!") e su mobile Web Share API se disponibile.
- [ ] Fila di avatar dei membri con username; l'host ha una corona/badge. Accanto a ogni membro, la lista che ha scelto (emoji + nome) oppure "non ha ancora scelto".
- [ ] **Selezione della lista (una per partecipante)**: ogni membro sceglie tra le **proprie** liste (selettore con le sue liste + conteggio film); update di `room_members.selected_list_id` della propria riga. Nessuno sfoglia le liste altrui; ciascuno vede solo le proprie. Le scelte si propagano in realtime.
- [ ] Anteprima del **pool di estrazione**: collage poster + conteggio "N film nel cilindro" = **unione (dedup)** delle liste scelte dai membri, al netto delle esclusioni della stanza (`Σ list_movies distinti − room_exclusions`).
- [ ] Bottone grande "🎬 Estrai il film" visibile solo all'host, abilitato se **almeno un membro** ha scelto una lista — per oggi può portare a un placeholder, l'estrazione è il Giorno 6.

### 4. Realtime
- [ ] Hook `useRoomRealtime(roomId)`: un channel Supabase con subscription postgres_changes su `rooms` (update), `room_members` (insert/delete/**update** — la scelta lista arriva da qui), `room_exclusions` (insert), filtrate per `room_id`; aggiorna lo stato locale della lobby.
- [ ] Per mostrare a tutti il **pool** (poster/conteggio/animazione) serve che i membri leggano i `list_movies` delle liste scelte dagli altri: la policy RLS `can_view_list` va **riscritta** così → *una lista è visibile se è stata scelta (`room_members.selected_list_id`) da un membro qualsiasi di una stanza di cui l'utente è membro*. Serve inoltre una **policy UPDATE su `room_members`** (la propria riga, e `selected_list_id` deve essere una lista propria — `owns_list`). Applicare con una migration/snippet SQL.
- [ ] Test con due browser/account: l'utente B entra col link e A lo vede apparire senza refresh; ogni membro sceglie la sua lista e gli altri vedono le scelte + il pool cambiare live.

## Criteri di accettazione
- A crea una stanza, copia il link, B (altro browser, altro account) lo apre, si registra al volo e atterra di nuovo nella stanza, entra: A vede l'avatar di B comparire in tempo reale.
- A e B scelgono ciascuno una propria lista: entrambi vedono le scelte reciproche e il collage/conteggio del pool aggiornarsi live.
- Un non membro senza link (URL con code sbagliato) vede un 404/"Stanza non trovata" pulito.
- Il codice stanza non è indovinabile per enumerazione banale (36^6 combinazioni ~2 miliardi: ok).
