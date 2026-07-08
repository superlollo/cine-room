"use client";

import Image from "next/image";
import { useState } from "react";
import { Film } from "lucide-react";
import { posterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

// Poster TMDB con next/image (fill): il contenitore deve avere dimensioni/aspect.
export function MoviePoster({
  path,
  alt,
  sizes = "342px",
  className,
}: {
  path: string | null | undefined;
  alt: string;
  sizes?: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const src = posterUrl(path, "w342");

  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-surface-2 text-muted",
          className,
        )}
      >
        <Film className="size-8" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-surface-2", className)}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-white/10" />}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        onLoad={() => setLoaded(true)}
        className={cn(
          "object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
