"use client";

import { motion } from "framer-motion";
import { REACTIONS } from "@/lib/reactions";
import { cn } from "@/lib/utils";

// Barra di reazioni predefinite: toggle on/off, con conteggio per emoji.
export function ReactionBar({
  counts,
  mine,
  disabled,
  onToggle,
}: {
  counts: Record<string, number>;
  mine: Set<string>;
  disabled?: boolean;
  onToggle: (emoji: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {REACTIONS.map((emoji) => {
        const n = counts[emoji] ?? 0;
        const active = mine.has(emoji);
        return (
          <motion.button
            key={emoji}
            type="button"
            disabled={disabled}
            whileTap={{ scale: 0.9 }}
            onClick={() => onToggle(emoji)}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition disabled:pointer-events-none disabled:opacity-50",
              active
                ? "border-accent-gold/60 bg-accent-gold/10"
                : "border-white/10 bg-white/5 hover:bg-white/10",
            )}
          >
            <span>{emoji}</span>
            {n > 0 && <span className="text-xs text-muted">{n}</span>}
          </motion.button>
        );
      })}
    </div>
  );
}
