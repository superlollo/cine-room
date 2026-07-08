import { NextResponse } from "next/server";
import { getMovieDetails } from "@/lib/tmdb.server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/tmdb/movie/[id] → dettagli completi + upsert nella cache `movies`.
// Da chiamare quando un film viene aggiunto a una lista (Giorno 4).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tmdbId = Number(id);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  try {
    const movie = await getMovieDetails(tmdbId);

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("movies")
      .upsert(movie, { onConflict: "tmdb_id" })
      .select()
      .single();

    if (error) {
      console.error("movies upsert error:", error);
      return NextResponse.json({ error: "upsert_failed" }, { status: 500 });
    }

    return NextResponse.json({ movie: data });
  } catch (err) {
    console.error("TMDB movie error:", err);
    return NextResponse.json({ error: "tmdb_failed" }, { status: 502 });
  }
}
