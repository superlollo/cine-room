import Link from "next/link";
import { Clapperboard } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <span className="bg-accent-gradient mb-6 flex size-14 items-center justify-center rounded-2xl shadow-lg shadow-accent-red/30">
        <Clapperboard className="size-7 text-black" strokeWidth={2.2} />
      </span>
      <p className="font-mono text-sm tracking-widest text-muted">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold">
        Questo film non è in cartellone
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        La pagina che cerchi non esiste, oppure la stanza è stata chiusa.
      </p>
      <Link
        href="/"
        className="bg-accent-gradient mt-8 inline-flex h-12 items-center justify-center rounded-2xl px-8 font-semibold text-black shadow-lg shadow-accent-red/20 transition hover:brightness-110"
      >
        Torna alla home
      </Link>
    </div>
  );
}
