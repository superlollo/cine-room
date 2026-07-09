# CineRoom — Overview del progetto

> **Questo file è il contesto di base.** Va incollato/letto in OGNI sessione di sviluppo insieme al file del giorno corrente. Contiene le decisioni tecniche vincolanti: non cambiarle senza motivo esplicito.

## 1. Il problema

Quando si è in gruppo (amici/famiglia) non si sa mai cosa guardare e si perdono ore a scrollare i cataloghi. **CineRoom** risolve il problema così:

1. Ogni utente si crea una o più **liste** di film che vuole vedere (con ricerca + autocomplete su un catalogo enorme).
2. Un utente crea una **stanza** (sala cinema) e condivide un link: gli altri entrano.
3. Nella stanza **ogni partecipante sceglie una sua lista** (una a testa, tra le proprie). L'app **estrae a caso** un film dall'**unione** delle liste scelte dai membri (film unici, dedup). Basta che almeno un membro abbia scelto una lista per poter estrarre.
4. Se il film viene **confermato**, viene "bruciato" **solo in quella stanza** (non potrà più uscire lì), ma **NON viene rimosso da nessuna lista**: se una di quelle liste è usata in un'altra stanza, lì il film può ancora uscire.

## 2. Stack tecnico (vincolante)

| Componente | Scelta | Note |
|---|---|---|
| Framework | **Next.js 15+ (App Router) + TypeScript** | `npx create-next-app@latest` |
| Styling | **Tailwind CSS** + **framer-motion** | Estetica premium, animazioni fluide |
| Backend/DB | **Supabase** (Postgres + Auth + Realtime) | Client `@supabase/supabase-js` + `@supabase/ssr` |
| Catalogo film | **TMDB API** (themoviedb.org) | Gratuita, ~1M film, endpoint search per l'autocomplete |
| Deploy | **Vercel** | Giorno 7 |

Variabili d'ambiente (`.env.local`, mai committate):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # solo server-side
TMDB_API_KEY=                     # solo server-side, chiamate proxate da route handler
```

## 3. Schema database (Supabase / Postgres)

```sql
-- Profilo utente (1:1 con auth.users, creato via trigger)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Cache locale dei film TMDB (evita di richiamare TMDB per i dettagli)
create table movies (
  tmdb_id integer primary key,
  title text not null,
  original_title text,
  poster_path text,
  backdrop_path text,
  release_year integer,
  overview text,
  runtime integer,
  genres jsonb default '[]',
  vote_average numeric(3,1),
  created_at timestamptz default now()
);

-- Liste "da vedere" (un utente può averne più di una)
create table lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  emoji text default '🎬',
  created_at timestamptz default now()
);

create table list_movies (
  list_id uuid references lists(id) on delete cascade,
  movie_id integer references movies(tmdb_id) on delete cascade,
  added_at timestamptz default now(),
  primary key (list_id, movie_id)
);

-- Stanze (sale cinema)
create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                -- codice corto per il link, es. "XK4P9Q"
  name text not null,
  host_id uuid not null references profiles(id) on delete cascade,
  current_movie_id integer references movies(tmdb_id),            -- estrazione in corso, non ancora confermata
  status text not null default 'open' check (status in ('open','drawing','decided')),
  created_at timestamptz default now()
);

-- Ogni membro sceglie UNA sua lista (selected_list_id): il pool di estrazione
-- è l'unione (dedup) delle liste scelte dai membri della stanza.
create table room_members (
  room_id uuid references rooms(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  selected_list_id uuid references lists(id) on delete set null,  -- la lista scelta da questo membro
  joined_at timestamptz default now(),
  primary key (room_id, user_id)
);

-- Film "bruciati" PER STANZA (il cuore della logica: l'esclusione è locale alla stanza)
create table room_exclusions (
  room_id uuid references rooms(id) on delete cascade,
  movie_id integer references movies(tmdb_id) on delete cascade,
  excluded_at timestamptz default now(),
  primary key (room_id, movie_id)
);
```

**Regola d'oro:** confermare un film = `insert into room_exclusions` + `rooms.status = 'decided'`. La riga in `list_movies` **non si tocca mai** durante l'estrazione.

### Estrazione casuale (RPC Postgres, server-side)

```sql
create or replace function draw_movie(p_room_id uuid)
returns integer language plpgsql security definer as $$
declare v_movie integer;
begin
  -- pool = unione (dedup) delle liste scelte dai membri, meno le esclusioni stanza
  select lm.movie_id into v_movie
  from room_members rm
  join list_movies lm on lm.list_id = rm.selected_list_id
  where rm.room_id = p_room_id
    and rm.selected_list_id is not null
    and lm.movie_id not in (select movie_id from room_exclusions where room_id = p_room_id)
  group by lm.movie_id                        -- dedup: ogni film unico una volta
  order by random() limit 1;

  update rooms set current_movie_id = v_movie,
                   status = case when v_movie is null then status else 'drawing' end
  where id = p_room_id;
  return v_movie;  -- null = pool esaurito in questa stanza
end $$;
```

### RLS (Row Level Security) — abilitarla su tutte le tabelle

- `profiles`: lettura pubblica (per mostrare i membri), update solo proprietario.
- `movies`: lettura per tutti gli autenticati; insert via route handler server-side.
- `lists` / `list_movies`: CRUD solo per `owner_id = auth.uid()`; **SELECT anche per i membri di una stanza se la lista è stata scelta da un membro qualsiasi di quella stanza** (`can_view_list`: serve a mostrare il pool/animazione a tutti). Ognuno però sceglie solo tra le **proprie** liste.
- `rooms`: SELECT per i membri **e** lookup per `code` (per la pagina di join); update solo host.
- `room_members`: insert self-service (join), select per membri della stessa stanza, **update della propria riga** per settare `selected_list_id` (solo a una lista propria).
- `room_exclusions`: select per membri, insert solo host (o via RPC `security definer`).

## 4. Realtime

Nella pagina stanza sottoscrivere via **Supabase Realtime** (postgres_changes) le tabelle `rooms`, `room_members`, `room_exclusions` filtrate per `room_id`: tutti i membri vedono in tempo reale chi entra, **quale lista ha scelto ciascun membro** (update su `room_members.selected_list_id`), l'estrazione in corso e la conferma finale.

## 5. Struttura del progetto

```
src/
  app/
    (auth)/login/page.tsx
    (auth)/register/page.tsx
    (app)/home/page.tsx            # dashboard: liste + stanze
    (app)/lists/[id]/page.tsx      # dettaglio lista
    (app)/profile/page.tsx
    room/[code]/page.tsx           # stanza (accessibile via link condiviso)
    api/tmdb/search/route.ts       # proxy autocomplete TMDB
    api/tmdb/movie/[id]/route.ts   # dettagli + upsert in `movies`
  components/
    ui/                            # bottoni, input, card, modali, skeleton
    movies/                        # MovieCard, MoviePoster, SearchAutocomplete
    rooms/                         # RoomLobby, DrawWheel, MemberAvatars
  lib/
    supabase/ (client.ts, server.ts, middleware.ts)
    tmdb.ts
    types.ts
```

## 6. Design system — estetica premium (riferimento: Flickhunt)

- **Tema scuro cinematografico**: sfondo quasi nero `#0A0A0F`, superfici `#14141C`, glassmorphism (`backdrop-blur`, bordi `white/10`).
- **Accento**: gradiente ambra/oro → rosso (`#F5C518` → `#E50914` come richiamo cinema) usato con parsimonia su CTA e stati attivi.
- **Poster-driven UI**: i poster TMDB (`https://image.tmdb.org/t/p/w342{poster_path}`) sono i protagonisti; hover con scale + glow; backdrop sfocati come sfondi delle pagine dettaglio.
- **Tipografia**: font display per i titoli (es. `Clash Display`/`Sora` via next/font), `Inter` per il body.
- **Animazioni** (framer-motion): transizioni di pagina, stagger sulle griglie di poster, e soprattutto **l'estrazione = momento teatrale** (roulette/slot di poster, vedi Giorno 6).
- **Mobile-first**: l'app si userà sul divano, dal telefono.

## 7. Piano dei giorni

| Giorno | File | Contenuto |
|---|---|---|
| 1 | `01-giorno-1-setup.md` | Setup Next.js + Supabase, schema DB, design system base |
| 2 | `02-giorno-2-auth.md` | Registrazione, login, profilo, route protette |
| 3 | `03-giorno-3-catalogo.md` | Integrazione TMDB, ricerca con autocomplete |
| 4 | `04-giorno-4-liste.md` | CRUD liste, aggiunta/rimozione film, homepage |
| 5 | `05-giorno-5-stanze.md` | Creazione stanze, link condivisione, join, lobby realtime |
| 6 | `06-giorno-6-estrazione.md` | Estrazione casuale, conferma/ripescaggio, esclusioni per stanza |
| 7 | `07-giorno-7-polish-deploy.md` | Rifinitura UI, empty state, responsive, deploy Vercel |

**Come usare il piano in una nuova sessione:** incolla questo prompt →
> Leggi `piano/00-OVERVIEW.md` e `piano/0X-giorno-X-....md`, poi implementa i task del giorno X seguendo le decisioni dell'overview. Alla fine verifica i criteri di accettazione elencati nel file del giorno.
