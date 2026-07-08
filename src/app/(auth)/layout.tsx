import Link from "next/link";
import { Clapperboard } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      {/* Alone extra dietro la card, oltre allo spotlight globale */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-red/10 blur-[120px]"
      />

      <Link
        href="/"
        className="mb-8 flex items-center gap-2 transition hover:opacity-90"
      >
        <span className="bg-accent-gradient flex size-10 items-center justify-center rounded-xl shadow-lg shadow-accent-red/30">
          <Clapperboard className="size-6 text-black" strokeWidth={2.2} />
        </span>
        <span className="font-display text-2xl font-bold tracking-tight">
          Cine<span className="text-accent-gradient">Room</span>
        </span>
      </Link>

      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
