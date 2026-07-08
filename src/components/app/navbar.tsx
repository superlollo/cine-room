"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Home, User } from "lucide-react";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";

const links = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/profile", label: "Profilo", icon: User },
];

export function Navbar({
  username,
  avatar,
}: {
  username: string | null;
  avatar: string | null;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Top bar — sticky, glassmorphism */}
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

          <nav className="hidden items-center gap-1 sm:flex">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                  isActive(href)
                    ? "bg-white/10 text-foreground"
                    : "text-muted hover:bg-white/5 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>

          <Link
            href="/profile"
            className="rounded-full ring-offset-2 ring-offset-background transition hover:opacity-90"
            aria-label="Profilo"
          >
            <Avatar src={avatar} name={username} size={32} />
          </Link>
        </div>
      </header>

      {/* Bottom nav — solo mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-background/80 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-5xl">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition",
                isActive(href) ? "text-accent-gold" : "text-muted",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
