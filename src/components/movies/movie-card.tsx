"use client";

import { motion } from "framer-motion";
import { Star, X } from "lucide-react";
import { MoviePoster } from "./movie-poster";

export function MovieCard({
  title,
  year,
  poster,
  rating,
  onClick,
  onRemove,
}: {
  title: string;
  year?: number | null;
  poster: string | null;
  rating?: number | null;
  onClick?: () => void;
  onRemove?: () => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative"
    >
      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={(e) => {
          if (onClick && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onClick();
          }
        }}
        className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 shadow-lg outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-accent-gold/60 group-hover:shadow-2xl group-hover:shadow-accent-gold/20 data-[clickable=true]:cursor-pointer"
        data-clickable={!!onClick}
      >
        <MoviePoster
          path={poster}
          alt={title}
          className="h-full w-full"
          sizes="(max-width: 640px) 40vw, 180px"
        />
        {typeof rating === "number" && rating > 0 && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-black/70 px-1.5 py-0.5 text-xs font-medium backdrop-blur">
            <Star className="size-3 fill-accent-gold text-accent-gold" />
            {rating.toFixed(1)}
          </span>
        )}
        {onRemove && (
          <button
            type="button"
            aria-label={`Rimuovi ${title}`}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute left-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/70 text-white opacity-100 backdrop-blur transition hover:bg-accent-red sm:opacity-0 sm:group-hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="mt-2">
        <p className="truncate text-sm font-medium">{title}</p>
        {year && <p className="text-xs text-muted">{year}</p>}
      </div>
    </motion.div>
  );
}
