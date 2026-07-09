# Giorno 6 — Estrazione casuale: il cuore dell'app

> Prerequisito: Giorni 1-5 completati. Leggere `00-OVERVIEW.md`, in particolare la funzione `draw_movie` e la **regola d'oro** (§3): confermare = escludere SOLO in quella stanza, mai toccare `list_movies`.

## Obiettivo

L'estrazione del film con animazione teatrale, la conferma (che brucia il film solo nella stanza) e il ripescaggio. È il momento in cui l'app deve emozionare: dedicare a UX/animazioni la stessa cura della logica.

## Task

### 1. Flusso di estrazione (logica)
- [ ] L'host preme "🎬 Estrai il film" → chiamata RPC `draw_movie(room_id)` (server action o `supabase.rpc`) → la funzione sceglie a caso tra i film dell'**unione (dedup) delle liste scelte dai membri** della stanza, **esclusi quelli in `room_exclusions` della stanza**, setta `rooms.current_movie_id` e `status='drawing'`.
- [ ] Tutti i membri ricevono l'update via realtime (già cablato al Giorno 5) e vedono l'animazione + il risultato in sincrono.
- [ ] Sotto il film estratto, due bottoni (solo host, gli altri li vedono disabilitati con label "L'host sta decidendo…"):
  - **"✓ Lo guardiamo!"** → insert in `room_exclusions (room_id, movie_id)` + update `rooms.status='decided'`. Il film resta mostrato come "Film della serata".
  - **"↻ Ripesca"** → il film rifiutato **NON** va in `room_exclusions` (non è bruciato per sempre): si richiama `draw_movie(room_id, p_temp_exclude)` passando lato client la lista dei film scartati in questo turno, così non ripropone subito lo stesso film. *Decisione rivista: solo la conferma ("Lo guardiamo!") brucia il film nella stanza; "Ripesca" lo scarta solo per il turno corrente e può ricomparire in un'estrazione successiva. Documentarlo nella UI con un microcopy tipo "scartato per questo turno, potrà ricomparire in futuro".*
- [ ] `draw_movie` ritorna `null` → pool esaurito in questa stanza: schermata dedicata "Avete visto tutto! 🏆" con opzioni: i membri cambiano/aggiungono la propria lista (torna alla selezione) oppure azzerare le esclusioni della stanza (bottone "Ricomincia da capo" → delete di `room_exclusions` della stanza, solo host, con conferma).
- [ ] Dopo la conferma (`status='decided'`), l'host può comunque fare "Nuova estrazione" (riporta a `open`/`drawing`) per la prossima serata nella stessa stanza.

### 2. Verifica della regola d'oro (test critico)
- [ ] Test manuale documentato: stessa lista scelta da un membro in DUE stanze diverse. Estrarre e confermare "Film X" nella stanza 1 → nella stanza 2 "Film X" DEVE poter ancora uscire; in stanza 1 non deve più uscire. Verificare anche che `list_movies` sia intatta.
- [ ] Con N-1 film esclusi su N, l'estrazione deve restituire sempre l'unico rimasto.

### 3. Animazione dell'estrazione (il momento wow)
- [ ] Componente `DrawReveal` (`components/rooms/`): all'arrivo dell'update realtime, sequenza di ~3 secondi tipo **slot machine di poster**: una striscia di poster della lista scorre veloce sfocata, decelera con easing, e si ferma sul film estratto che scala al centro con glow dorato + il backdrop del film che sfuma come sfondo dell'intera pagina.
- [ ] Precaricare i poster del pool (le liste scelte dai membri) quando la stanza è in lobby (così l'animazione non mostra immagini rotte).
- [ ] Suspense/attesa: mentre gira, nascondere i bottoni; disabilitare doppie estrazioni (l'RPC su `status='drawing'` con `current_movie_id` già settato non deve essere richiamabile a raffica — guard nella UI e idealmente anche nella funzione SQL).
- [ ] Risultato: poster grande, titolo, anno, durata, generi, trama breve, rating. Confetti/particles discreti sulla conferma.

### 4. Cronologia della stanza
- [ ] Sezione collassabile "Già estratti in questa stanza": i film in `room_exclusions` con poster piccolo e data — dà trasparenza sul perché certi film non escono più.

## Criteri di accettazione
- Due account in due browser nella stessa stanza: l'host estrae, ENTRAMBI vedono la slot machine e lo stesso film, in sincrono.
- Conferma → il film appare nella cronologia della stanza e non esce più lì; nella seconda stanza con la stessa lista esce ancora. `list_movies` invariata (check su Supabase).
- Ripescaggio ripetuto **non esaurisce mai il pool da solo** (non brucia, solo evita ripetizioni immediate: dopo aver girato tra tutte le opzioni fresche del turno, ricomincia a proporle); l'esaurimento vero scatta solo quando restano solo film già **confermati** (in `room_exclusions`) in stanze precedenti/turni precedenti — schermata "Avete visto tutto" e "Ricomincia da capo" resetta davvero.
- Spam-click su "Estrai" non produce estrazioni multiple sovrapposte.
