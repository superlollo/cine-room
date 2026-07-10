// Set fisso di reazioni emoji consentite sui film visti (Giorno 9).
export const REACTIONS = ["🔥", "😂", "😭", "😴", "🤯", "❤️", "🍿", "💩"] as const;

export type ReactionEmoji = (typeof REACTIONS)[number];

export function isValidReaction(emoji: string): emoji is ReactionEmoji {
  return (REACTIONS as readonly string[]).includes(emoji);
}
