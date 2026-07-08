import { redirect } from "next/navigation";
import { Clapperboard, Film } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ListCard } from "@/components/lists/list-card";
import { NewListLauncher } from "@/components/lists/new-list-launcher";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lists } = await supabase
    .from("lists")
    .select("id, name, emoji")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  // Conteggio film + poster di anteprima per ogni lista (una query sola).
  const ids = (lists ?? []).map((l) => l.id);
  const preview: Record<string, { count: number; posters: string[] }> = {};
  if (ids.length > 0) {
    const { data: rows } = await supabase
      .from("list_movies")
      .select("list_id, added_at, movies(poster_path)")
      .in("list_id", ids)
      .order("added_at", { ascending: false });
    for (const row of rows ?? []) {
      const bucket = (preview[row.list_id] ??= { count: 0, posters: [] });
      bucket.count += 1;
      const poster = (
        row.movies as unknown as { poster_path: string | null } | null
      )?.poster_path;
      if (poster && bucket.posters.length < 4) bucket.posters.push(poster);
    }
  }

  const hasLists = (lists ?? []).length > 0;

  return (
    <div className="space-y-12 py-6">
      {/* Le tue liste */}
      <section>
        <h1 className="font-display text-2xl font-bold">Le tue liste</h1>
        <p className="mt-1 text-sm text-muted">
          Raccogli i film che vuoi vedere.
        </p>

        {hasLists ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {(lists ?? []).map((l) => (
              <ListCard
                key={l.id}
                id={l.id}
                name={l.name}
                emoji={l.emoji}
                count={preview[l.id]?.count ?? 0}
                posters={preview[l.id]?.posters ?? []}
              />
            ))}
            <NewListLauncher userId={user.id} variant="card" />
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] py-16 text-center">
            <span className="bg-accent-gradient flex size-14 items-center justify-center rounded-2xl shadow-lg shadow-accent-red/30">
              <Film className="size-7 text-black" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold">
                Ancora nessuna lista
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                Crea una lista, riempila di film e poi aprila in una stanza per
                decidere insieme cosa guardare.
              </p>
            </div>
            <NewListLauncher userId={user.id} variant="cta" />
          </div>
        )}
      </section>

      {/* Le tue stanze (Giorno 5) */}
      <section>
        <h2 className="font-display text-2xl font-bold">Le tue stanze</h2>
        <p className="mt-1 text-sm text-muted">
          Inviti gli amici e decidete insieme.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center text-muted">
          <Clapperboard className="size-8 opacity-60" />
          <p className="text-sm">Le stanze arrivano al Giorno 5.</p>
          <button
            disabled
            className="cursor-not-allowed rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm opacity-50"
          >
            Crea stanza
          </button>
        </div>
      </section>
    </div>
  );
}
