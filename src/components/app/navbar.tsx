"use client";

import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { Avatar } from "@/components/ui";

export function Navbar({
  username,
  avatar,
}: {
  username: string | null;
  avatar: string | null;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/home" className="flex items-center gap-2">
          <span className="bg-accent-gradient flex size-8 items-center justify-center rounded-lg shadow shadow-accent-red/30">
            <Clapperboard className="size-5 text-black" strokeWidth={2.2} />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Cine<span className="text-accent-gradient">Room</span>
          </span>
        </Link>

        <Link
          href="/profile"
          className="flex size-10 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition hover:opacity-90"
          aria-label="Profilo"
        >
          <Avatar src={avatar} name={username} size={32} />
        </Link>
      </div>
    </header>
  );
}
