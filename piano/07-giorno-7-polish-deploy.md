# Giorno 7 — Rifinitura premium e deploy

> Prerequisito: Giorni 1-6 completati e funzionanti. Leggere `00-OVERVIEW.md` §6 (design system).

## Obiettivo

Portare tutta l'app al livello "premium e accattivante" richiesto (riferimento Flickhunt), sistemare i dettagli e pubblicare su Vercel.

## Task

### 1. Passata di polish UI (pagina per pagina)
- [ ] **Landing `/`**: hero cinematografico — collage/parete di poster in movimento lento sullo sfondo (opacità bassa), titolo con gradiente, spiegazione in 3 step ("Crea le liste → Apri una sala → Lasciate decidere al caso"), CTA. È la vetrina: dedicarci tempo.
- [ ] **Transizioni di pagina** coerenti (framer-motion, fade+slide leggero) e stagger su tutte le griglie.
- [ ] **Micro-interazioni**: hover/active su ogni elemento cliccabile, focus-visible per la tastiera, pulsazione discreta sul bottone "Estrai".
- [ ] **Loading**: skeleton per ogni superficie che carica dati (mai spinner a pagina intera); `loading.tsx` per le route.
- [ ] **Empty state** per: nessuna lista, lista vuota, nessuna stanza, stanza in cui nessun membro ha ancora scelto una lista — ognuno con copy simpatico e CTA.
- [ ] **Error handling**: `error.tsx` e `not-found.tsx` a tema (404 = "Questo film non è in cartellone").
- [ ] Coerenza: audit di spaziature, radius, colori — nessun grigio/blu default di Tailwind fuori dai token del design system.

### 2. Responsive e accessibilità
- [ ] Test a 375px, 768px, 1440px di ogni pagina; bottom nav mobile; il flusso stanza dev'essere perfetto da telefono (è il caso d'uso reale: tutti sul divano col telefono).
- [ ] Contrasti AA sui testi, `aria-label` su bottoni icona, autocomplete navigabile da screen reader (`role="listbox"`/`option`), `prefers-reduced-motion` rispettato (slot machine ridotta a crossfade).

### 3. Qualità e sicurezza
- [ ] `npm run build` pulito, zero errori TypeScript/ESLint.
- [ ] Ricontrollare le RLS di TUTTE le tabelle con un account "ostile" (terzo account che non è membro di nulla): non deve leggere liste, stanze o esclusioni altrui.
- [ ] Rate limiting leggero sul proxy TMDB (per proteggere la quota della API key) — anche solo cache aggressiva + guard sulle query < 2 caratteri.
- [ ] Meta/OG: title, description, og:image (importante: il link stanza verrà condiviso su WhatsApp — curare l'anteprima con nome stanza generico e branding).

### 4. Deploy su Vercel (saltando i punti che sono già stati fatti)
- [ ] Repo GitHub (se non già fatto: `git init`, commit, push).
- [ ] Import su Vercel, configurare le 4 env var (production). `SUPABASE_SERVICE_ROLE_KEY` e `TMDB_API_KEY` NON devono essere `NEXT_PUBLIC_`.
- [ ] Su Supabase: aggiungere il dominio Vercel agli URL consentiti per l'auth (Site URL + redirect URLs).
- [ ] Smoke test in produzione dell'intero flusso: registrazione → lista con autocomplete → stanza → link condiviso aperto dal telefono → join → estrazione sincronizzata → conferma.

### 5. Extra (solo se avanza tempo, in ordine di valore)
1. Filtri all'estrazione (per genere/durata: "stasera max 2 ore").
2. Login con Google.
3. PWA (manifest + icona) per "installarla" sul telefono.
4. Pagina cronologia globale "film visti insieme".

## Criteri di accettazione
- L'app in produzione su URL Vercel, flusso completo funzionante da due dispositivi reali (PC + telefono).
- Nessuna pagina "spoglia": ogni stato (vuoto, caricamento, errore) è disegnato.
- Lighthouse mobile: Performance ≥ 80, Accessibility ≥ 90 sulla homepage e sulla stanza.
