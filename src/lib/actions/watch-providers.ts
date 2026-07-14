"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMovieDetails } from "@/lib/tmdb.server";

// Il backfill scatta quando l'host attiva il filtro piattaforme (Giorno 16):
// i film già in lista non hanno mai avuto un fetch dei provider, quindi il
// filtro non morderebbe su niente finché non li rinfreschiamo. Prende solo i
// film del pool con `providers_fetched_at` null (mai fetchati) — quelli solo
// "scaduti" li rinfresca da sé `WatchProviders` al render (giorno-per-giorno,
// non serve un'azione una tantum per quelli). Cap sul numero di film per
// turno per non intasare TMDB con un pool enorme; un altro toggle del filtro
// completa il resto.
const BATCH_CAP = 60;

export async function backfillRoomProviders(
  roomId: string,
): Promise<{ error: string } | { updated: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non sei autenticato." };

  const { data: memberRows } = await supabase
    .from("room_members")
    .select("selected_list_id")
    .eq("room_id", roomId);
  const listIds = (memberRows ?? [])
    .map((m) => m.selected_list_id)
    .filter((id): id is string => !!id);
  if (listIds.length === 0) return { updated: 0 };

  const { data: movieRows } = await supabase
    .from("list_movies")
    .select("movie_id, movies!inner(tmdb_id, providers_fetched_at)")
    .in("list_id", listIds);

  const staleIds = [
    ...new Set(
      (movieRows ?? [])
        .map(
          (r) =>
            r.movies as unknown as {
              tmdb_id: number;
              providers_fetched_at: string | null;
            },
        )
        .filter((m) => m.providers_fetched_at == null)
        .map((m) => m.tmdb_id),
    ),
  ].slice(0, BATCH_CAP);
  if (staleIds.length === 0) return { updated: 0 };

  const details = await Promise.all(
    staleIds.map((id) => getMovieDetails(id).catch(() => null)),
  );
  const rows = details.filter((d): d is NonNullable<typeof d> => d !== null);
  if (rows.length === 0) return { updated: 0 };

  const admin = createAdminClient();
  const { error } = await admin
    .from("movies")
    .upsert(rows, { onConflict: "tmdb_id" });
  if (error) return { error: "Errore nell'aggiornamento delle piattaforme." };

  return { updated: rows.length };
}
