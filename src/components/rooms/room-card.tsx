import Link from "next/link";
import { Crown, Users } from "lucide-react";
import type { RoomStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<RoomStatus, string> = {
  open: "Aperta",
  drawing: "In estrazione",
  decided: "Decisa",
};

const STATUS_STYLE: Record<RoomStatus, string> = {
  open: "border-white/10 bg-white/5 text-muted",
  drawing: "border-accent-gold/30 bg-accent-gold/10 text-accent-gold",
  decided: "border-accent-red/30 bg-accent-red/10 text-accent-red",
};

export function RoomCard({
  code,
  name,
  status,
  members,
  isHost,
  swiping = false,
}: {
  code: string;
  name: string;
  status: RoomStatus;
  members: number;
  isHost: boolean;
  /** C'è una sessione swipe aperta o in corso: si aspetta il tuo voto. */
  swiping?: boolean;
}) {
  return (
    <Link
      href={`/room/${code}`}
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition hover:bg-white/[0.07]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate font-medium">{name}</p>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-xs",
            swiping
              ? "border-accent-gold/40 bg-accent-gold/10 text-accent-gold"
              : STATUS_STYLE[status],
          )}
        >
          {swiping ? "🔥 Swipe in corso" : STATUS_LABEL[status]}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="flex items-center gap-1">
          <Users className="size-3.5" />
          {members}
        </span>
        {isHost && (
          <span className="flex items-center gap-1 text-accent-gold">
            <Crown className="size-3.5" />
            Host
          </span>
        )}
        <span className="ml-auto font-mono tracking-wider text-foreground/70">
          {code}
        </span>
      </div>
    </Link>
  );
}
