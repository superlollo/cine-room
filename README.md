# CineRoom (movie_picker)

Webapp per decidere insieme che film guardare: liste "da vedere" personali, stanze condivise via link, estrazione casuale con esclusioni per stanza.

## Piano di sviluppo

Il piano completo è in [`piano/`](piano/), diviso per giorni:

- [`00-OVERVIEW.md`](piano/00-OVERVIEW.md) — architettura, stack, schema DB, design system. **Da leggere in ogni sessione.**
- `01`→`07` — un file per giorno di sviluppo, con task e criteri di accettazione. ✅ Fase 1 completata.
- [`fase2/`](piano/fase2/) — piano fase 2 (giorni 8-13): feedback sui film visti, consigliati, Tinder-mode, performance. Partire da [`fase2/00-OVERVIEW-FASE2.md`](piano/fase2/00-OVERVIEW-FASE2.md), che documenta anche lo stack reale (Next 16, Tailwind v4, modello liste per-partecipante). ✅ Completata.
- [`fase3/`](piano/fase3/) — piano fase 3 (giorni 14-20): login Google, filtri all'estrazione, piattaforme streaming, statistiche, PWA+push, serie TV. Partire da [`fase3/00-OVERVIEW-FASE3.md`](piano/fase3/00-OVERVIEW-FASE3.md).

### Come usarlo con Claude Code

In una nuova sessione, incolla:

> Leggi `piano/00-OVERVIEW.md` e `piano/01-giorno-1-setup.md`, poi implementa i task del giorno seguendo le decisioni dell'overview. Alla fine verifica i criteri di accettazione.

E così via per i giorni successivi.
