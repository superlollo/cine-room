// Avatar predefiniti (emoji): scelta rapida per il Giorno 2.
// L'upload su Supabase Storage (bucket `avatars`) è stato aggiunto al Giorno 8.
export const PRESET_AVATARS = [
  "🍿",
  "🎬",
  "🎭",
  "🦉",
  "🐼",
  "🚀",
  "🎃",
  "👾",
  "🐙",
  "🌮",
  "🦖",
  "🎸",
  "🐳",
  "🦊",
  "🍕",
  "⚡",
] as const;

// true se il valore salvato in avatar_url è un'immagine (URL) e non un'emoji.
export function isAvatarUrl(value: string | null | undefined): boolean {
  return !!value && /^https?:\/\//.test(value);
}
