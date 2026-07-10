import { NextResponse } from "next/server";
import { getRecommendations } from "@/lib/tmdb.server";
import { createClient } from "@/lib/supabase/server";
import type { RoomRecommendation } from "@/lib/types";

const MAX_SEEDS = 5;
const MAX_RESULTS = 12;

// GET /api/rooms/[roomId]/recommendations → "Consigliati per questa stanza"
// (Giorno 10): semi = ultimi 5 film visti in stanza, pesati dalle stelline,
// consigli TMDB uniti per occorrenze, esclusi visti/pool/senza poster.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("room_members")
    .select("user_id")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "not_a_member" }, { status: 404 });
  }

  // Semi: ultimi 5 visti in stanza, più recenti prima.
  const { data: exclRows } = await supabase
    .from("room_exclusions")
    .select("movie_id, excluded_at, movies(title)")
    .eq("room_id", roomId)
    .order("excluded_at", { ascending: false })
    .limit(MAX_SEEDS);

  const seedRows = exclRows ?? [];
  if (seedRows.length === 0) {
    return NextResponse.json({ recommendations: [] satisfies RoomRecommendation[] });
  }

  const seedIds = seedRows.map((r) => r.movie_id as number);

  // Stelline sui semi, per pesatura e per lo scarto dei semi mal votati.
  const { data: ratingRows } = await supabase
    .from("movie_ratings")
    .select("movie_id, stars")
    .eq("room_id", roomId)
    .in("movie_id", seedIds);

  const starsByMovie = new Map<number, number[]>();
  for (const r of ratingRows ?? []) {
    const arr = starsByMovie.get(r.movie_id) ?? [];
    arr.push(r.stars);
    starsByMovie.set(r.movie_id, arr);
  }

  const seeds = seedRows
    .map((r) => {
      const stars = starsByMovie.get(r.movie_id as number) ?? [];
      const avg =
        stars.length > 0 ? stars.reduce((a, b) => a + b, 0) / stars.length : null;
      const title =
        (r.movies as unknown as { title: string } | null)?.title ?? "un film";
      return { movieId: r.movie_id as number, title, avg };
    })
    // Un film votato ≤2★ non genera consigli ("altri come quello che abbiamo odiato").
    .filter((s) => s.avg == null || s.avg > 2)
    .map((s) => ({ ...s, weight: s.avg != null && s.avg >= 4 ? 2 : 1 }));

  if (seeds.length === 0) {
    return NextResponse.json({ recommendations: [] satisfies RoomRecommendation[] });
  }

  // Da escludere: tutti i visti della stanza + tutto ciò che è già nel pool
  // (union delle liste scelte dai membri).
  const [{ data: allExclusions }, { data: memberRows }] = await Promise.all([
    supabase.from("room_exclusions").select("movie_id").eq("room_id", roomId),
    supabase
      .from("room_members")
      .select("selected_list_id")
      .eq("room_id", roomId),
  ]);
  const excludeSet = new Set((allExclusions ?? []).map((e) => e.movie_id as number));

  const selectedListIds = (memberRows ?? [])
    .map((m) => m.selected_list_id as string | null)
    .filter((id): id is string => !!id);
  if (selectedListIds.length > 0) {
    const { data: poolRows } = await supabase
      .from("list_movies")
      .select("movie_id")
      .in("list_id", selectedListIds);
    for (const p of poolRows ?? []) excludeSet.add(p.movie_id as number);
  }

  const recLists = await Promise.all(
    seeds.map((seed) => getRecommendations(seed.movieId)),
  );

  const merged = new Map<
    number,
    {
      movie: RoomRecommendation["movie"];
      weight: number;
      bestSeedWeight: number;
      reasonTitle: string;
      reasonStars: number | null;
    }
  >();

  recLists.forEach((results, i) => {
    const seed = seeds[i];
    for (const movie of results) {
      if (excludeSet.has(movie.tmdb_id)) continue;
      const existing = merged.get(movie.tmdb_id);
      if (existing) {
        existing.weight += seed.weight;
        if (seed.weight > existing.bestSeedWeight) {
          existing.bestSeedWeight = seed.weight;
          existing.reasonTitle = seed.title;
          existing.reasonStars = seed.avg;
        }
      } else {
        merged.set(movie.tmdb_id, {
          movie,
          weight: seed.weight,
          bestSeedWeight: seed.weight,
          reasonTitle: seed.title,
          reasonStars: seed.avg,
        });
      }
    }
  });

  const recommendations: RoomRecommendation[] = [...merged.values()]
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return (b.movie.vote_average ?? 0) - (a.movie.vote_average ?? 0);
    })
    .slice(0, MAX_RESULTS)
    .map((r) => ({
      movie: r.movie,
      reasonTitle: r.reasonTitle,
      reasonStars: r.reasonStars,
    }));

  return NextResponse.json({ recommendations });
}
