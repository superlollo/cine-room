# Giorno 6 — Estrazione casuale: il cuore dell'app

> Prerequisito: Giorni 1-5 completati. Leggere `00-OVERVIEW.md`, in particolare la funzione `draw_movie` e la **regola d'oro** (§3): confermare = escludere SOLO in quella stanza, mai toccare `list_movies`.

## Obiettivo

L'estrazione del film con animazione teatrale, la conferma (che brucia il film solo nella stanza) e il ripescaggio. È il momento in cui l'app deve emozionare: dedicare a UX/animazioni la stessa cura della logica.

## Task

### 1. Flusso di estrazione (logica)
- [ ] L'host preme "🎬 Estrai il film" → chiamata RPC `draw_movie(room_id)` (server action o `supabase.rpc`) → la funzione sceglie a caso tra i film della lista selezionata **esclusi quelli in `room_exclusions` della stanza**, setta `rooms.current_movie_id` e `status='drawing'`.
- [ ] Tutti i membri ricevono l'update via realtime (già cablato al Giorno 5) e vedono l'animazione + il risultato in sincrono.
- [ ] Sotto il film estratto, due bottoni (solo host, gli altri li vedono disabilitati con label "L'host sta decidendo…"):
  - **"✓ Lo guardiamo!"** → insert in `room_exclusions (room_id, movie_id)` + update `rooms.status='decided'`. Il film resta mostrato come "Film della serata".
  - **"↻ Ripesca"** → anche il film rifiutato va in `room_exclusions` (così non riesce subito) e si richiama `draw_movie`. *Decisione presa: il "ripesca" brucia il film nella stanza — è il comportamento richiesto ("non possa più uscire"). Documentarlo nella UI con un microcopy tipo "non uscirà più in questa stanza".*
- [ ] `draw_movie` ritorna `null` → lista esaurita in questa stanza: schermata dedicata "Avete visto tutto! 🏆" con opzioni: cambiare lista (torna alla selezione) o azzerare le esclusioni della stanza (bottone "Ricomincia da capo" → delete di `room_exclusions` della stanza, solo host, con conferma).
- [ ] Dopo la conferma (`status='decided'`), l'host può comunque fare "Nuova estrazione" (riporta a `open`/`drawing`) per la prossima serata nella stessa stanza.

### 2. Verifica della regola d'oro (test critico)
- [ ] Test manuale documentato: stessa lista selezionata in DUE stanze diverse. Estrarre e confermare "Film X" nella stanza 1 → nella stanza 2 "Film X" DEVE poter ancora uscire; in stanza 1 non deve più uscire. Verificare anche che `list_movies` sia intatta.
- [ ] Con N-1 film esclusi su N, l'estrazione deve restituire sempre l'unico rimasto.

### 3. Animazione dell'estrazione (il momento wow)
- [ ] Componente `DrawReveal` (`components/rooms/`): all'arrivo dell'update realtime, sequenza di ~3 secondi tipo **slot machine di poster**: una striscia di poster della lista scorre veloce sfocata, decelera con easing, e si ferma sul film estratto che scala al centro con glow dorato + il backdrop del film che sfuma come sfondo dell'intera pagina.
- [ ] Precaricare i poster della lista quando la stanza è in lobby (così l'animazione non mostra immagini rotte).
- [ ] Suspense/attesa: mentre gira, nascondere i bottoni; disabilitare doppie estrazioni (l'RPC su `status='drawing'` con `current_movie_id` già settato non deve essere richiamabile a raffica — guard nella UI e idealmente anche nella funzione SQL).
- [ ] Risultato: poster grande, titolo, anno, durata, generi, trama breve, rating. Confetti/particles discreti sulla conferma.

### 4. Cronologia della stanza
- [ ] Sezione collassabile "Già estratti in questa stanza": i film in `room_exclusions` con poster piccolo e data — dà trasparenza sul perché certi film non escono più.

## Criteri di accettazione
- Due account in due browser nella stessa stanza: l'host estrae, ENTRAMBI vedono la slot machine e lo stesso film, in sincrono.
- Conferma → il film appare nella cronologia della stanza e non esce più lì; nella seconda stanza con la stessa lista esce ancora. `list_movies` invariata (check su Supabase).
- Ripescaggio ripetuto fino a esaurimento → schermata "Avete visto tutto" e "Ricomincia da capo" resetta davvero.
- Spam-click su "Estrai" non produce estrazioni multiple sovrapposte.
