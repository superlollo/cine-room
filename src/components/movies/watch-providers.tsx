"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Movie, WatchProviderItem } from "@/lib/types";
import { TMDB_IMAGE_BASE } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isStale(fetchedAt: string | null): boolean {
  if (!fetchedAt) return true;
  return Date.now() - new Date(fetchedAt).getTime() > SEVEN_DAYS_MS;
}

function dedupe(list: WatchProviderItem[]): WatchProviderItem[] {
  const seen = new Set<number>();
  const out: WatchProviderItem[] = [];
  for (const p of list) {
    if (seen.has(p.provider_id)) continue;
    seen.add(p.provider_id);
    out.push(p);
  }
  return out;
}

/**
 * Fila di loghi piattaforma per un film (Giorno 16): priorità a `flatrate`
 * (abbonamento), `rent`/`buy` compressi in un pill espandibile. Attribuzione
 * JustWatch obbligatoria per i termini TMDB.
 *
 * Quando `autoRefresh` è vero e la cache ha più di 7 giorni (o non è mai
 * stata popolata), innesca da sé un refresh in background chiamando la stessa
 * route dell'upsert — fire-and-forget, non blocca il render: un eventuale
 * aggiornamento arriva al prossimo refresh della pagina. Usarlo solo dove il
 * film è mostrato come risultato/dettaglio, non nelle righe di una lista.
 *
 * `interactive=false` disattiva il pill espandibile rent/buy (reso come testo
 * statico): serve nei punti dove il componente finisce già dentro un
 * `<button>` — es. la riga della cronologia — perché un `<button>` annidato
 * in un altro `<button>` è HTML non valido e rompe l'hydration.
 */
export function WatchProviders({
  movie,
  size = "md",
  autoRefresh = true,
  interactive = true,
}: {
  movie: Pick<Movie, "tmdb_id" | "watch_providers" | "providers_fetched_at">;
  size?: "sm" | "md";
  autoRefresh?: boolean;
  interactive?: boolean;
}) {
  const router = useRouter();
  const triggered = useRef(false);

  useEffect(() => {
    if (!autoRefresh) return;
    if (triggered.current) return;
    if (!isStale(movie.providers_fetched_at)) return;
    triggered.current = true;
    fetch(`/api/tmdb/movie/${movie.tmdb_id}`)
      .then(() => router.refresh())
      .catch(() => {});
  }, [autoRefresh, movie.tmdb_id, movie.providers_fetched_at, router]);

  const wp = movie.watch_providers;
  const flatrate = wp?.flatrate ?? [];
  const rentBuy = dedupe([...(wp?.rent ?? []), ...(wp?.buy ?? [])]);
  const logoSize = size === "sm" ? "size-6" : "size-8";

  if (!wp || (flatrate.length === 0 && rentBuy.length === 0)) {
    return (
      <p className={cn("text-muted", size === "sm" ? "text-xs" : "text-sm")}>
        Non disponibile in streaming in Italia 🏴‍☠️
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {flatrate.map((p) => (
          <ProviderLogo key={p.provider_id} provider={p} className={logoSize} />
        ))}
        {rentBuy.length > 0 && (
          <RentBuyDisclosure providers={rentBuy} size={size} interactive={interactive} />
        )}
      </div>
      <p className="text-[10px] text-muted/70">Dati JustWatch</p>
    </div>
  );
}

function ProviderLogo({
  provider,
  className,
}: {
  provider: WatchProviderItem;
  className: string;
}) {
  if (!provider.logo_path) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${TMDB_IMAGE_BASE}/w45${provider.logo_path}`}
      alt={provider.provider_name}
      title={provider.provider_name}
      className={cn("shrink-0 rounded-full border border-white/10 object-cover", className)}
    />
  );
}

function RentBuyDisclosure({
  providers,
  size,
  interactive,
}: {
  providers: WatchProviderItem[];
  size: "sm" | "md";
  interactive: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {providers.map((p) => (
          <ProviderLogo
            key={p.provider_id}
            provider={p}
            className={size === "sm" ? "size-6" : "size-8"}
          />
        ))}
      </div>
    );
  }
  const label = `a noleggio su ${providers.length} piattaform${providers.length === 1 ? "a" : "e"}`;
  const className =
    "rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-muted transition hover:bg-white/10";
  if (!interactive) return <span className={className}>{label}</span>;
  return (
    <button type="button" onClick={() => setOpen(true)} className={className}>
      {label}
    </button>
  );
}
