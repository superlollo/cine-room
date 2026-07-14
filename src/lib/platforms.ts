// Piattaforme di streaming principali in Italia, coi provider_id TMDB e i
// logo_path verificati contro `GET /watch/providers/movie?watch_region=IT`
// (Giorno 16). Statiche di proposito, come `genres.ts`.
//
// Nota: il piano ipotizzava "Infinity+" con id 110, che nel catalogo TMDB non
// esiste — il provider italiano di Mediaset è "Mediaset Infinity" (id 359).

export interface PlatformOption {
  id: number;
  name: string;
  logoPath: string;
}

export const STREAMING_PLATFORMS: PlatformOption[] = [
  { id: 8, name: "Netflix", logoPath: "/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg" },
  { id: 119, name: "Prime Video", logoPath: "/pvske1MyAoymrs5bguRfVqYiM9a.jpg" },
  { id: 337, name: "Disney+", logoPath: "/97yvRBw1GzX7fXprcF80er19ot.jpg" },
  { id: 39, name: "NOW", logoPath: "/g0E9h3JAeIwmdvxlT73jiEuxdNj.jpg" },
  { id: 350, name: "Apple TV+", logoPath: "/mcbz1LgtErU9p4UdbZ0rG6RTWHX.jpg" },
  { id: 531, name: "Paramount+", logoPath: "/h5DcR0J2EESLitnhR8xLG1QymTE.jpg" },
  { id: 359, name: "Mediaset Infinity", logoPath: "/2hBbMVUI2G4GAGRAD0RZCZqDMUh.jpg" },
  { id: 222, name: "RaiPlay", logoPath: "/cmURKKdS72Ckr52615xvc2JPsJm.jpg" },
  { id: 109, name: "Timvision", logoPath: "/FyDfVwFZGuu2KVv7Kuz4ww7Ra3.jpg" },
];

const BY_ID = new Map(STREAMING_PLATFORMS.map((p) => [p.id, p]));

export function platformById(id: number): PlatformOption | undefined {
  return BY_ID.get(id);
}
