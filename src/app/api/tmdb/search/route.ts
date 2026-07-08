import { NextResponse, type NextRequest } from "next/server";
import { searchMovies } from "@/lib/tmdb.server";

// GET /api/tmdb/search?q=inter → { results: MovieSearchResult[] }
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchMovies(q);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("TMDB search error:", err);
    return NextResponse.json({ error: "search_failed" }, { status: 502 });
  }
}
