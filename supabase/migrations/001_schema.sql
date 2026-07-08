-- =============================================================================
-- CineRoom — schema iniziale (Giorno 1)
-- Rispecchia il §3 dell'overview: tabelle, RPC draw_movie, trigger profili,
-- RLS su tutte le tabelle, Realtime su rooms/room_members/room_exclusions.
--
-- Eseguibile dallo SQL editor di Supabase o via `supabase db push`.
-- Scritto per essere ri-eseguibile (idempotente) senza errori.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabelle
-- -----------------------------------------------------------------------------

-- Profilo utente (1:1 con auth.users, creato via trigger)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Cache locale dei film TMDB
create table if not exists public.movies (
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
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  emoji text default '🎬',
  created_at timestamptz default now()
);

create table if not exists public.list_movies (
  list_id uuid references public.lists(id) on delete cascade,
  movie_id integer references public.movies(tmdb_id) on delete cascade,
  added_at timestamptz default now(),
  primary key (list_id, movie_id)
);

-- Stanze (sale cinema)
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  host_id uuid not null references public.profiles(id) on delete cascade,
  selected_list_id uuid references public.lists(id) on delete set null,
  current_movie_id integer references public.movies(tmdb_id),
  status text not null default 'open' check (status in ('open','drawing','decided')),
  created_at timestamptz default now()
);

create table if not exists public.room_members (
  room_id uuid references public.rooms(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (room_id, user_id)
);

-- Film "bruciati" PER STANZA (l'esclusione è locale alla stanza)
create table if not exists public.room_exclusions (
  room_id uuid references public.rooms(id) on delete cascade,
  movie_id integer references public.movies(tmdb_id) on delete cascade,
  excluded_at timestamptz default now(),
  primary key (room_id, movie_id)
);

-- Indici utili
create index if not exists idx_lists_owner on public.lists(owner_id);
create index if not exists idx_list_movies_movie on public.list_movies(movie_id);
create index if not exists idx_rooms_host on public.rooms(host_id);
create index if not exists idx_room_members_user on public.room_members(user_id);

-- -----------------------------------------------------------------------------
-- 2. Funzioni helper (SECURITY DEFINER per evitare ricorsione nelle policy RLS)
-- -----------------------------------------------------------------------------

create or replace function public.is_room_member(p_room_id uuid, p_user_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from room_members
    where room_id = p_room_id and user_id = p_user_id
  );
$$;

create or replace function public.is_room_host(p_room_id uuid, p_user_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from rooms
    where id = p_room_id and host_id = p_user_id
  );
$$;

create or replace function public.owns_list(p_list_id uuid, p_user_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from lists
    where id = p_list_id and owner_id = p_user_id
  );
$$;

-- Una lista è visibile a un utente se è selezionata in una stanza di cui è membro
create or replace function public.can_view_list(p_list_id uuid, p_user_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from rooms r
    join room_members rm on rm.room_id = r.id
    where r.selected_list_id = p_list_id and rm.user_id = p_user_id
  );
$$;

-- -----------------------------------------------------------------------------
-- 3. Estrazione casuale (RPC Postgres, server-side)
-- -----------------------------------------------------------------------------

create or replace function public.draw_movie(p_room_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_movie integer;
begin
  select lm.movie_id into v_movie
  from rooms r
  join list_movies lm on lm.list_id = r.selected_list_id
  where r.id = p_room_id
    and lm.movie_id not in (
      select movie_id from room_exclusions where room_id = p_room_id
    )
  order by random() limit 1;

  update rooms
     set current_movie_id = v_movie,
         status = case when v_movie is null then status else 'drawing' end
   where id = p_room_id;

  return v_movie;  -- null = lista esaurita in questa stanza
end $$;

grant execute on function public.draw_movie(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Trigger: crea il profilo alla registrazione
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'username', ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 5. Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles       enable row level security;
alter table public.movies         enable row level security;
alter table public.lists          enable row level security;
alter table public.list_movies    enable row level security;
alter table public.rooms          enable row level security;
alter table public.room_members   enable row level security;
alter table public.room_exclusions enable row level security;

-- profiles: lettura pubblica, update solo proprietario
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (true);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- movies: lettura per autenticati; upsert cache lato server (autenticati)
drop policy if exists movies_select on public.movies;
create policy movies_select on public.movies
  for select to authenticated using (true);

drop policy if exists movies_insert on public.movies;
create policy movies_insert on public.movies
  for insert to authenticated with check (true);

drop policy if exists movies_update on public.movies;
create policy movies_update on public.movies
  for update to authenticated using (true) with check (true);

-- lists: CRUD proprietario; SELECT anche per membri di stanze in cui è selezionata
drop policy if exists lists_select on public.lists;
create policy lists_select on public.lists
  for select using (
    owner_id = auth.uid() or public.can_view_list(id, auth.uid())
  );

drop policy if exists lists_insert on public.lists;
create policy lists_insert on public.lists
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists lists_update on public.lists;
create policy lists_update on public.lists
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists lists_delete on public.lists;
create policy lists_delete on public.lists
  for delete using (owner_id = auth.uid());

-- list_movies: gestione per proprietario della lista; SELECT anche per membri stanza
drop policy if exists list_movies_select on public.list_movies;
create policy list_movies_select on public.list_movies
  for select using (
    public.owns_list(list_id, auth.uid())
    or public.can_view_list(list_id, auth.uid())
  );

drop policy if exists list_movies_insert on public.list_movies;
create policy list_movies_insert on public.list_movies
  for insert to authenticated
  with check (public.owns_list(list_id, auth.uid()));

drop policy if exists list_movies_delete on public.list_movies;
create policy list_movies_delete on public.list_movies
  for delete using (public.owns_list(list_id, auth.uid()));

-- rooms: SELECT aperta (serve il lookup per code nella pagina di join);
--        insert dell'host, update/delete solo host
drop policy if exists rooms_select on public.rooms;
create policy rooms_select on public.rooms
  for select using (true);

drop policy if exists rooms_insert on public.rooms;
create policy rooms_insert on public.rooms
  for insert to authenticated with check (host_id = auth.uid());

drop policy if exists rooms_update on public.rooms;
create policy rooms_update on public.rooms
  for update using (host_id = auth.uid()) with check (host_id = auth.uid());

drop policy if exists rooms_delete on public.rooms;
create policy rooms_delete on public.rooms
  for delete using (host_id = auth.uid());

-- room_members: join self-service, select per membri della stessa stanza
drop policy if exists room_members_select on public.room_members;
create policy room_members_select on public.room_members
  for select using (public.is_room_member(room_id, auth.uid()));

drop policy if exists room_members_insert on public.room_members;
create policy room_members_insert on public.room_members
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists room_members_delete on public.room_members;
create policy room_members_delete on public.room_members
  for delete using (user_id = auth.uid());

-- room_exclusions: select per membri, insert solo host (o via RPC security definer)
drop policy if exists room_exclusions_select on public.room_exclusions;
create policy room_exclusions_select on public.room_exclusions
  for select using (public.is_room_member(room_id, auth.uid()));

drop policy if exists room_exclusions_insert on public.room_exclusions;
create policy room_exclusions_insert on public.room_exclusions
  for insert to authenticated
  with check (public.is_room_host(room_id, auth.uid()));

-- -----------------------------------------------------------------------------
-- 6. Realtime — publication supabase_realtime + replica identity full
-- -----------------------------------------------------------------------------

alter table public.rooms          replica identity full;
alter table public.room_members   replica identity full;
alter table public.room_exclusions replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'room_members'
  ) then
    alter publication supabase_realtime add table public.room_members;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'room_exclusions'
  ) then
    alter publication supabase_realtime add table public.room_exclusions;
  end if;
end $$;
