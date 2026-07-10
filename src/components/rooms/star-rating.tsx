"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Stelline tap-abili (1-5, senza mezzi punti). Mostra anche la media della
// stanza accanto. `value` è il voto dell'utente corrente (0 = non ancora votato).
export function StarRating({
  value,
  average,
  count,
  disabled,
  onRate,
}: {
  value: number;
  average: number | null;
  count: number;
  disabled?: boolean;
  onRate: (stars: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <motion.button
            key={n}
            type="button"
            disabled={disabled}
            whileTap={{ scale: 1.3 }}
            onMouseEnter={() => setHover(n)}
            onClick={() => onRate(n)}
            aria-label={`${n} stelle`}
            className="p-0.5 disabled:pointer-events-none"
          >
            <Star
              className={cn(
                "size-6 transition-colors",
                n <= shown
                  ? "fill-accent-gold text-accent-gold drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]"
                  : "text-white/20",
              )}
            />
          </motion.button>
        ))}
      </div>
      {count > 0 && average != null && (
        <span className="text-xs text-muted">
          ★ {average.toFixed(1)} · {count} {count === 1 ? "voto" : "voti"}
        </span>
      )}
    </div>
  );
}
