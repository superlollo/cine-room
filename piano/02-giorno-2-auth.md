# Giorno 2 — Autenticazione e profilo

> Prerequisito: Giorno 1 completato (progetto + Supabase + design system). Leggere `00-OVERVIEW.md`.

## Obiettivo

Registrazione, login, logout, gestione profilo. Route protette funzionanti.

## Task

### 1. Registrazione — `(auth)/register/page.tsx`
- [ ] Form: username, email, password (con conferma). Validazione client (username 3-20 caratteri alfanumerici, password ≥ 8).
- [ ] `supabase.auth.signUp` passando `options.data.username` → il trigger del Giorno 1 crea il profilo.
- [ ] Gestire l'errore "username già in uso": fare un check di unicità su `profiles` prima del signUp.
- [ ] Se il progetto Supabase ha la conferma email attiva, mostrare schermata "controlla la mail"; altrimenti redirect a `/home`.

### 2. Login — `(auth)/login/page.tsx`
- [ ] Form email + password, `signInWithPassword`, errori mostrati inline (mai alert browser).
- [ ] Link "Non hai un account? Registrati" e viceversa.
- [ ] (Opzionale, solo se rapido) Login con Google via `signInWithOAuth` — non bloccare la giornata su questo.

### 3. Layout auth
- [ ] Le due pagine condividono un layout `(auth)/layout.tsx` scenografico: card glassmorphism centrata, sfondo con gradiente/poster sfocati, logo in alto. Prima occasione per l'estetica premium: curare hover, focus ring, stati di loading dei bottoni (spinner inline).

### 4. Profilo — `(app)/profile/page.tsx`
- [ ] Mostra avatar, username, email; permette di cambiare username (con check unicità) e avatar.
- [ ] Avatar: upload su Supabase Storage (bucket `avatars`, pubblico in lettura, policy di scrittura solo sul proprio path `{user_id}/*`) **oppure**, più semplice, una griglia di avatar predefiniti (emoji/gradenti generati). Scegliere l'opzione più rapida, l'upload si può rimandare al Giorno 7.
- [ ] Bottone logout.

### 5. Shell dell'app autenticata
- [ ] `(app)/layout.tsx`: navbar (logo, link Home/Profilo, avatar utente) — sticky, glassmorphism. Su mobile: bottom nav.
- [ ] `/home` per ora placeholder ("Le tue liste arrivano al Giorno 4") ma raggiungibile solo da loggati.
- [ ] Verificare il middleware: utente non loggato su `/home` → redirect `/login`; loggato su `/login` → redirect `/home`.

## Criteri di accettazione
- Flusso completo: registrazione → riga creata in `profiles` con lo username scelto → logout → login → `/home`.
- Username duplicato in registrazione → errore chiaro inline, nessun utente creato.
- Cambio username dal profilo persiste dopo refresh.
- Tutte le pagine auth sono gradevoli anche su mobile (viewport 375px).
