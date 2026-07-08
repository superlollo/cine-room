# Giorno 1 — Setup progetto, Supabase e design system

> Prerequisito: leggere `00-OVERVIEW.md`. Alla fine di oggi il progetto parte in locale, il DB è pronto e le fondamenta grafiche ci sono.

## Obiettivo

Scheletro Next.js funzionante, database Supabase completo di schema + RLS + trigger, design system di base (tema scuro, componenti UI primitivi).

## Task

### 1. Bootstrap del progetto
- [ ] `npx create-next-app@latest` nella root del repo (TypeScript, Tailwind, App Router, `src/`, import alias `@/*`).
- [ ] Installare: `@supabase/supabase-js @supabase/ssr framer-motion lucide-react`.
- [ ] Creare la struttura cartelle come da §5 dell'overview (anche vuote, con file placeholder).
- [ ] `.env.local` con le 4 variabili dell'overview + `.env.example` committabile con i nomi senza valori.

### 2. Progetto Supabase
- [ ] L'utente deve creare il progetto su [supabase.com](https://supabase.com) e incollare URL + chiavi in `.env.local`. **Se le chiavi non sono disponibili, fermarsi e chiederle** — tutto il resto del giorno dipende da questo.
- [ ] Creare una migration SQL (cartella `supabase/migrations/001_schema.sql`) con **tutto lo schema del §3 dell'overview**: tabelle, funzione `draw_movie`, e in più:
  - trigger `on_auth_user_created` → crea la riga in `profiles` prendendo `username` dai metadata di signup;
  - abilitare RLS su ogni tabella con le policy descritte nell'overview;
  - abilitare Realtime (publication `supabase_realtime`) su `rooms`, `room_members`, `room_exclusions`.
- [ ] Eseguire la migration (SQL editor di Supabase o `supabase db push` se si usa la CLI).

### 3. Client Supabase
- [ ] `src/lib/supabase/client.ts` (browser), `server.ts` (server components/route handlers), `middleware.ts` (refresh sessione) secondo la doc `@supabase/ssr`.
- [ ] `middleware.ts` alla root: protegge `(app)/*`, redirect a `/login` se non autenticati; `/room/[code]` invece deve restare raggiungibile anche da non loggati (mostrerà un invito al login, vedi Giorno 5).

### 4. Design system base
- [ ] Configurare in `globals.css` + Tailwind i token del §6 dell'overview: colori (`background #0A0A0F`, `surface #14141C`, accento gradiente oro→rosso), radius generosi (`rounded-2xl`), ombre soft.
- [ ] Font con `next/font`: display (Sora o simile) + Inter.
- [ ] Componenti in `src/components/ui/`: `Button` (varianti primary gradiente / ghost / danger), `Input`, `Card` (glassmorphism: `bg-white/5 backdrop-blur border border-white/10`), `Modal`, `Skeleton`, `Avatar`.
- [ ] Layout root con sfondo scuro + una texture/gradiente radiale sottile (tipo faretto da sala cinema in alto).
- [ ] Pagina landing provvisoria `/` con logo/nome app ("CineRoom" o altro nome a scelta), tagline e bottoni Login/Registrati — servirà per testare i componenti.

## Criteri di accettazione
- `npm run dev` parte senza errori e la landing è visibile con il tema scuro premium.
- Nel dashboard Supabase esistono tutte le 7 tabelle, con RLS attiva su ognuna.
- La funzione `draw_movie` esiste (verificabile con `select draw_movie('00000000-0000-0000-0000-000000000000');` → ritorna null senza errori).
- Lint e typecheck puliti (`npm run lint`, `npx tsc --noEmit`).
