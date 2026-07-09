import Link from "next/link";
import { Clapperboard } from "lucide-react";

// Chrome minimale per la pagina stanza (fuori dalla shell app autenticata).
export function RoomShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-white/10 bg-background/70 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center px-4">
          <Link href="/home" className="flex items-center gap-2">
            <span className="bg-accent-gradient flex size-8 items-center justify-center rounded-lg shadow shadow-accent-red/30">
              <Clapperboard className="size-5 text-black" strokeWidth={2.2} />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">
              Cine<span className="text-accent-gradient">Room</span>
            </span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
