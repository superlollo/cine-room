# Giorno 5 — Stanze (sale cinema), link di condivisione e lobby realtime

> Prerequisito: Giorni 1-4 completati. Leggere `00-OVERVIEW.md`.

## Obiettivo

Creare stanze, entrarci tramite link condiviso, vedere i membri in tempo reale e selezionare la lista (una sola) da cui si estrarrà.

## Task

### 1. Creazione stanza
- [ ] Dalla homepage, CTA "Crea stanza": modal con nome stanza (default "Serata film 🍿").
- [ ] Insert su `rooms` con `code` generato server-side: 6 caratteri alfanumerici maiuscoli non ambigui (no 0/O/1/I), retry su collisione. Host inserito anche in `room_members`.
- [ ] Redirect a `/room/[code]`.
- [ ] In homepage, sezione "Le tue stanze": card delle stanze di cui si è membri (nome, n° membri, stato, ultima attività) con link.

### 2. Join tramite link — `/room/[code]`
- [ ] La pagina è raggiungibile da chiunque abbia il link. Tre casi:
  - **Non loggato** → schermata invito: nome stanza, host, "Accedi o registrati per entrare"; dopo l'auth si torna QUI (usare `redirectTo`/param `next`).
  - **Loggato, non membro** → schermata "Ti hanno invitato in {nome}" con bottone "Entra" → insert in `room_members`.
  - **Membro** → lobby (sotto).
- [ ] Serve una policy RLS che consenta il SELECT su `rooms` per `code` anche ai non membri (solo campi necessari: nome, host, status). Se al Giorno 1 non era prevista, aggiungerla con una migration.

### 3. Lobby della stanza
- [ ] Header: nome stanza, codice, bottone **"Copia link invito"** (clipboard + toast "Link copiato!") e su mobile Web Share API se disponibile.
- [ ] Fila di avatar dei membri con username; l'host ha una corona/badge.
- [ ] **Selezione della lista** (una sola per stanza): pannello che mostra le liste di TUTTI i membri raggruppate per proprietario ("Le liste di Marco", …), con conteggio film. Qualunque membro può proporre/cambiare? **No: solo l'host seleziona** (più semplice e senza conflitti; gli altri vedono la selezione in realtime). Update di `rooms.selected_list_id`.
- [ ] Mostrare anteprima della lista selezionata: collage poster + conteggio "N film nel cilindro" (già al netto delle esclusioni della stanza: `list_movies - room_exclusions`).
- [ ] Bottone grande "🎬 Estrai il film" visibile solo all'host e solo se una lista è selezionata — per oggi può portare a un placeholder, l'estrazione è il Giorno 6.

### 4. Realtime
- [ ] Hook `useRoomRealtime(roomId)`: un channel Supabase con subscription postgres_changes su `rooms` (update), `room_members` (insert/delete), `room_exclusions` (insert), filtrate per `room_id`; aggiorna lo stato locale della lobby.
- [ ] Per le liste dei membri serve che i membri possano leggere le liste altrui **dentro la stanza**: verificare/aggiungere la policy RLS descritta nell'overview (SELECT su `lists`/`list_movies` se esiste una stanza in comune, o almeno se la lista è `selected_list_id` di una stanza di cui si è membri — in tal caso il pannello di selezione mostra solo le liste proprie + quella selezionata; scegliere l'approccio e documentarlo in un commento nella migration).
- [ ] Test con due browser/account: l'utente B entra col link e A lo vede apparire senza refresh; A seleziona una lista e B la vede cambiare.

## Criteri di accettazione
- A crea una stanza, copia il link, B (altro browser, altro account) lo apre, si registra al volo e atterra di nuovo nella stanza, entra: A vede l'avatar di B comparire in tempo reale.
- L'host seleziona una lista: tutti i membri vedono nome, collage e conteggio aggiornarsi live.
- Un non membro senza link (URL con code sbagliato) vede un 404/"Stanza non trovata" pulito.
- Il codice stanza non è indovinabile per enumerazione banale (36^6 combinazioni ~2 miliardi: ok).
