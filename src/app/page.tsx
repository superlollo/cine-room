import Link from "next/link";
import { redirect } from "next/navigation";
import { Clapperboard, ListVideo, Users, Dices } from "lucide-react";
import { Card } from "@/components/ui";
import { PosterWall } from "@/components/landing/poster-wall";
import { getPopularPosters } from "@/lib/tmdb.server";
import { getUserCached } from "@/lib/supabase/server";

const steps = [
  {
    icon: ListVideo,
    title: "Crea le liste",
    text: "Cerca tra ~1M di film e salva quelli che vuoi vedere.",
  },
  {
    icon: Users,
    title: "Apri una sala",
    text: "Condividi il link: amici e famiglia entrano in un tap.",
  },
  {
    icon: Dices,
    title: "Lasciate decidere al caso",
    text: "Ognuno sceglie una lista, l'app pesca un film per tutti.",
  },
];

export default async function Home() {
  const { user } = await getUserCached();
  if (user) redirect("/home");

  const posters = await getPopularPosters(20);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col items-center justify-center px-6 py-20 text-center">
      <PosterWall posters={posters} />
      {/* Logo + wordmark */}
      <div className="mb-8 flex items-center gap-3">
        <span className="bg-accent-gradient flex size-12 items-center justify-center rounded-2xl shadow-lg shadow-accent-red/30">
          <Clapperboard className="size-7 text-black" strokeWidth={2.2} />
        </span>
        <span className="font-display text-3xl font-bold tracking-tight">
          Cine<span className="text-accent-gradient">Room</span>
        </span>
      </div>

      {/* Hero */}
      <h1 className="font-display max-w-3xl text-balance text-4xl font-bold leading-tight sm:text-6xl">
        Basta litigare su <span className="text-accent-gradient">cosa</span>{" "}
        guardare.
      </h1>
      <p className="mt-5 max-w-xl text-balance text-base text-muted sm:text-lg">
        Liste di film condivise, stanze via link ed estrazione a caso. CineRoom
        sceglie per voi in pochi secondi — direttamente dal divano.
      </p>

      {/* CTA */}
      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/register"
          className="bg-accent-gradient inline-flex h-12 items-center justify-center rounded-2xl px-8 font-semibold text-black shadow-lg shadow-accent-red/20 transition hover:brightness-110"
        >
          Inizia gratis
        </Link>
        <Link
          href="/login"
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-8 font-medium text-foreground backdrop-blur transition hover:bg-white/10"
        >
          Accedi
        </Link>
      </div>

      {/* Come funziona */}
      <div className="mt-20 grid w-full gap-4 sm:grid-cols-3">
        {steps.map(({ icon: Icon, title, text }, i) => (
          <Card key={title} className="text-left">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-accent-gold">
                <Icon className="size-5" />
              </span>
              <span className="text-xs font-semibold text-muted">
                0{i + 1}
              </span>
            </div>
            <h3 className="font-display font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
