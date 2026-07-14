// Statistiche della stanza (Giorno 17): calcolo puro a partire dai dati già
// esistenti (nessuna nuova tabella). Chiamato da app/room/[code]/stats/page.tsx,
// che fa solo il fetch; qui vive la logica, per tenerla testabile e leggibile.

import { genreById } from "./genres";
import type { Movie } from "./types";

// Roma–New York non-stop, ~8h50 di media: solo per la microcopy della copertina.
const FLIGHT_MINUTES_ROME_NY = 530;

export interface StatsMember {
  userId: string;
  username: string;
  avatarUrl: string | null;
  selectedListId: string | null;
  joinedAt: string;
}

export interface StatsHistoryEntry {
  movie: Movie;
  excludedAt: string;
}

export interface StatsRatingRow {
  movie_id: number;
  user_id: string;
  stars: number;
}

export interface StatsSwipeVoteRow {
  session_id: string;
  user_id: string;
  movie_id: number;
  liked: boolean;
}

export interface RoomStatsData {
  filmCount: number;
  totalMinutes: number;
  longestMember: { username: string; avatarUrl: string | null; joinedAt: string } | null;
  topGenres: { id: number; label: string; emoji: string; count: number }[];
  bestMovie: { movie: Movie; avg: number; count: number } | null;
  worstMovie: { movie: Movie; avg: number; count: number } | null;
  critic: { username: string; avatarUrl: string | null; avg: number } | null;
  generous: { username: string; avatarUrl: string | null; avg: number } | null;
  topReaction: { emoji: string; count: number } | null;
  bestPair: { a: string; b: string; pct: number; common: number } | null;
  worstPair: { a: string; b: string; pct: number; common: number } | null;
  contributors: { username: string; avatarUrl: string | null; count: number; avgStars: number | null }[];
}

export function formatMinutesTogether(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const timeLabel = h > 0 ? `${h} ore e ${m} min` : `${m} min`;
  const flights = totalMinutes / FLIGHT_MINUTES_ROME_NY;
  // Sotto 0.1 voli la battuta non regge (pochi minuti totali): la si omette.
  return flights >= 0.1
    ? `${timeLabel} — pari a ${flights.toFixed(1)} voli Roma–New York`
    : timeLabel;
}

export function computeRoomStats({
  members,
  history,
  ratings,
  reactionEmojis,
  listMovies,
  swipeVotes,
}: {
  members: StatsMember[];
  history: StatsHistoryEntry[];
  ratings: StatsRatingRow[];
  reactionEmojis: string[];
  listMovies: { list_id: string; movie_id: number }[];
  swipeVotes: StatsSwipeVoteRow[];
}): RoomStatsData {
  const memberById = new Map(members.map((m) => [m.userId, m]));

  const filmCount = history.length;
  const totalMinutes = history.reduce((sum, h) => sum + (h.movie.runtime ?? 0), 0);

  const longestMember = members.length
    ? members.reduce((a, b) => (new Date(a.joinedAt) <= new Date(b.joinedAt) ? a : b))
    : null;

  // I vostri generi: un +1 per film per genere, non pesato sulla durata.
  const genreCounts = new Map<number, number>();
  for (const h of history) {
    for (const g of h.movie.genres ?? []) {
      genreCounts.set(g.id, (genreCounts.get(g.id) ?? 0) + 1);
    }
  }
  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => {
      const opt = genreById(id);
      return { id, label: opt?.label ?? "Altro", emoji: opt?.emoji ?? "🎬", count };
    });

  // Medie per film (serve al podio e a "chi porta i film giusti").
  const movieById = new Map(history.map((h) => [h.movie.tmdb_id, h.movie]));
  const starsByMovie = new Map<number, number[]>();
  for (const r of ratings) {
    const arr = starsByMovie.get(r.movie_id) ?? [];
    arr.push(r.stars);
    starsByMovie.set(r.movie_id, arr);
  }
  const movieAverages = [...starsByMovie.entries()]
    .map(([movieId, stars]) => ({
      movie: movieById.get(movieId),
      avg: stars.reduce((a, b) => a + b, 0) / stars.length,
      count: stars.length,
    }))
    .filter((m): m is { movie: Movie; avg: number; count: number } => !!m.movie);

  // Podio: min 2 voti per evitare che un solo voto decida tutto.
  const qualifying = movieAverages.filter((m) => m.count >= 2);
  const bestMovie =
    qualifying.length > 0 ? qualifying.reduce((a, b) => (b.avg > a.avg ? b : a)) : null;
  const worstMovie =
    qualifying.length > 1 ? qualifying.reduce((a, b) => (b.avg < a.avg ? b : a)) : null;

  // Il critico e il generoso: media delle stelline date da ciascun membro.
  const starsByUser = new Map<string, number[]>();
  for (const r of ratings) {
    const arr = starsByUser.get(r.user_id) ?? [];
    arr.push(r.stars);
    starsByUser.set(r.user_id, arr);
  }
  const userAverages = [...starsByUser.entries()]
    .map(([userId, stars]) => ({
      member: memberById.get(userId),
      avg: stars.reduce((a, b) => a + b, 0) / stars.length,
    }))
    .filter((u): u is { member: StatsMember; avg: number } => !!u.member);

  let critic: RoomStatsData["critic"] = null;
  let generous: RoomStatsData["generous"] = null;
  if (userAverages.length >= 2) {
    const sorted = [...userAverages].sort((a, b) => a.avg - b.avg);
    const lo = sorted[0];
    const hi = sorted[sorted.length - 1];
    // Se tutti danno la stessa media non c'è né un critico né un generoso.
    if (lo.avg !== hi.avg) {
      critic = { username: lo.member.username, avatarUrl: lo.member.avatarUrl, avg: lo.avg };
      generous = { username: hi.member.username, avatarUrl: hi.member.avatarUrl, avg: hi.avg };
    }
  }

  // Reazione della casa
  const reactionCounts = new Map<string, number>();
  for (const emoji of reactionEmojis) {
    reactionCounts.set(emoji, (reactionCounts.get(emoji) ?? 0) + 1);
  }
  const topReactionEntry = [...reactionCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topReaction = topReactionEntry
    ? { emoji: topReactionEntry[0], count: topReactionEntry[1] }
    : null;

  // Intesa di coppia: coppie di voti sullo stesso film ALLA STESSA sessione
  // (lo stesso tmdb_id può ricomparire in sessioni diverse con esiti diversi).
  const voteMap = new Map<string, Map<string, boolean>>();
  for (const v of swipeVotes) {
    const key = `${v.session_id}:${v.movie_id}`;
    const inner = voteMap.get(key) ?? new Map<string, boolean>();
    inner.set(v.user_id, v.liked);
    voteMap.set(key, inner);
  }
  const pairStats = new Map<string, { common: number; agree: number }>();
  for (const inner of voteMap.values()) {
    const users = [...inner.keys()];
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const [a, b] = [users[i], users[j]].sort();
        const key = `${a}:${b}`;
        const stat = pairStats.get(key) ?? { common: 0, agree: 0 };
        stat.common += 1;
        if (inner.get(a) === inner.get(b)) stat.agree += 1;
        pairStats.set(key, stat);
      }
    }
  }
  const pairResults = [...pairStats.entries()]
    .map(([key, stat]) => {
      const [aId, bId] = key.split(":");
      return {
        a: memberById.get(aId)?.username ?? "utente",
        b: memberById.get(bId)?.username ?? "utente",
        common: stat.common,
        pct: (stat.agree / stat.common) * 100,
      };
    })
    // Soglia del brief: serve un minimo di voti in comune perché la % sia
    // significativa (2 film su 2 uguali non è "87% d'accordo").
    .filter((p) => p.common >= 10);
  const bestPair =
    pairResults.length > 0 ? pairResults.reduce((x, y) => (y.pct > x.pct ? y : x)) : null;
  const worstPair =
    pairResults.length > 1 ? pairResults.reduce((x, y) => (y.pct < x.pct ? y : x)) : null;

  // Chi porta i film giusti: un film "visto" conta per OGNI membro che lo
  // aveva nella propria lista scelta (approssimato di proposito, vedi piano).
  const movieIdsByList = new Map<string, Set<number>>();
  for (const lm of listMovies) {
    const set = movieIdsByList.get(lm.list_id) ?? new Set<number>();
    set.add(lm.movie_id);
    movieIdsByList.set(lm.list_id, set);
  }
  const movieAvgById = new Map(movieAverages.map((m) => [m.movie.tmdb_id, m.avg]));
  const contributors = members
    .filter((m): m is StatsMember & { selectedListId: string } => !!m.selectedListId)
    .map((m) => {
      const movieIds = [...(movieIdsByList.get(m.selectedListId) ?? [])];
      const withRating = movieIds
        .map((id) => movieAvgById.get(id))
        .filter((avg): avg is number => avg != null);
      return {
        username: m.username,
        avatarUrl: m.avatarUrl,
        count: movieIds.length,
        avgStars:
          withRating.length > 0
            ? withRating.reduce((a, b) => a + b, 0) / withRating.length
            : null,
      };
    })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    filmCount,
    totalMinutes,
    longestMember: longestMember
      ? {
          username: longestMember.username,
          avatarUrl: longestMember.avatarUrl,
          joinedAt: longestMember.joinedAt,
        }
      : null,
    topGenres,
    bestMovie,
    worstMovie,
    critic,
    generous,
    topReaction,
    bestPair,
    worstPair,
    contributors,
  };
}
