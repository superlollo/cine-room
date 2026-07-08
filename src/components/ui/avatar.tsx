import { cn } from "@/lib/utils";
import { isAvatarUrl } from "@/lib/avatars";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

// `src` può essere: un URL immagine, un'emoji preset, oppure null (→ iniziali).
export function Avatar({ src, name, size = 40, className }: AvatarProps) {
  const initials = (name ?? "?").trim().slice(0, 2).toUpperCase() || "?";

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10 text-xs font-semibold text-foreground select-none",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {isAvatarUrl(src) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt={name ?? "avatar"}
          className="h-full w-full object-cover"
        />
      ) : src ? (
        <span style={{ fontSize: size * 0.55, lineHeight: 1 }}>{src}</span>
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
