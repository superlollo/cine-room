"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowLeft, MessageCircleHeart, Skull, Trophy, Users } from "lucide-react";
import type { RoomStatsData } from "@/lib/room-stats";
import { formatMinutesTogether } from "@/lib/room-stats";
import { Avatar } from "@/components/ui";
import { posterUrl } from "@/lib/tmdb";

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Rome",
});

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" },
  }),
};

function StatCard({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      custom={index}
      initial="hidden"
      animate="show"
      variants={cardVariants}
      className="rounded-3xl border border-white/10 bg-white/[0.03] p-6"
    >
      {children}
    </motion.section>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-accent-gold">
      {children}
    </p>
  );
}

function Header({ roomCode, roomName }: { roomCode: string; roomName: string }) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/room/${roomCode}`}
        aria-label="Torna alla stanza"
        className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted transition hover:bg-white/10 hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
      </Link>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-widest text-muted">I vostri numeri</p>
        <h1 className="truncate font-display text-xl font-bold">{roomName}</h1>
      </div>
    </div>
  );
}

export function RoomStatsEmpty({
  roomCode,
  roomName,
}: {
  roomCode: string;
  roomName: string;
}) {
  return (
    <div className="space-y-6">
      <Header roomCode={roomCode} roomName={roomName} />
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <div className="text-4xl">🍿</div>
        <h2 className="mt-2 font-display text-2xl font-bold">Ancora troppo presto</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          Guardatevi qualche film insieme: le statistiche arrivano dopo la
          prima estrazione confermata.
        </p>
      </div>
    </div>
  );
}

export function RoomStats({
  roomCode,
  roomName,
  data,
}: {
  roomCode: string;
  roomName: string;
  data: RoomStatsData;
}) {
  let cardIndex = 0;
  const maxGenreCount = data.topGenres[0]?.count ?? 0;

  return (
    <div className="space-y-6">
      <Header roomCode={roomCode} roomName={roomName} />

      {/* 1. La copertina */}
      <StatCard index={cardIndex++}>
        <CardTitle>La copertina</CardTitle>
        <p className="text-accent-gradient mt-3 font-display text-5xl font-black">
          {data.filmCount}
        </p>
        <p className="text-sm text-muted">
          {data.filmCount === 1 ? "film visto insieme" : "film visti insieme"}
        </p>
        <p className="mt-4 text-lg font-semibold">
          {formatMinutesTogether(data.totalMinutes)}
        </p>
        {data.longestMember && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
            <Avatar
              src={data.longestMember.avatarUrl}
              name={data.longestMember.username}
              size={36}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {data.longestMember.username}
              </p>
              <p className="text-xs text-muted">
                nella stanza dal {dateFormatter.format(new Date(data.longestMember.joinedAt))}
              </p>
            </div>
          </div>
        )}
      </StatCard>

      {/* 2. I vostri generi */}
      {data.topGenres.length > 0 && (
        <StatCard index={cardIndex++}>
          <CardTitle>I vostri generi</CardTitle>
          <div className="mt-4 space-y-3">
            {data.topGenres.map((g, idx) => (
              <div key={g.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>
                    {g.emoji} {g.label}
                  </span>
                  <span className="text-muted">{g.count}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${maxGenreCount > 0 ? (g.count / maxGenreCount) * 100 : 0}%`,
                    }}
                    transition={{ delay: 0.3 + idx * 0.08, duration: 0.6, ease: "easeOut" }}
                    className="bg-accent-gradient h-full rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </StatCard>
      )}

      {/* 3. Il podio */}
      {(data.bestMovie || data.worstMovie) && (
        <StatCard index={cardIndex++}>
          <CardTitle>Il podio</CardTitle>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {data.bestMovie && (
              <div className="flex items-center gap-3">
                {posterUrl(data.bestMovie.movie.poster_path, "w185") && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={posterUrl(data.bestMovie.movie.poster_path, "w185") ?? undefined}
                    alt={data.bestMovie.movie.title}
                    className="w-16 shrink-0 rounded-lg border border-white/10 object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-xs text-accent-gold">
                    <Trophy className="size-3.5" /> Il migliore
                  </p>
                  <p className="truncate font-semibold">{data.bestMovie.movie.title}</p>
                  <p className="text-xs text-muted">
                    {data.bestMovie.avg.toFixed(1)} ⭐ · {data.bestMovie.count} voti
                  </p>
                </div>
              </div>
            )}
            {data.worstMovie && (
              <div className="flex items-center gap-3">
                {posterUrl(data.worstMovie.movie.poster_path, "w185") && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={posterUrl(data.worstMovie.movie.poster_path, "w185") ?? undefined}
                    alt={data.worstMovie.movie.title}
                    className="w-16 shrink-0 rounded-lg border border-white/10 object-cover grayscale"
                  />
                )}
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-xs text-muted">
                    <Skull className="size-3.5" /> Il flop della stanza 💀
                  </p>
                  <p className="truncate font-semibold">{data.worstMovie.movie.title}</p>
                  <p className="text-xs text-muted">
                    {data.worstMovie.avg.toFixed(1)} ⭐ · {data.worstMovie.count} voti
                  </p>
                </div>
              </div>
            )}
          </div>
        </StatCard>
      )}

      {/* 4. Il critico e il generoso */}
      {(data.critic || data.generous) && (
        <StatCard index={cardIndex++}>
          <CardTitle>Il critico e il generoso</CardTitle>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {data.critic && (
              <div className="flex items-center gap-3">
                <Avatar src={data.critic.avatarUrl} name={data.critic.username} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{data.critic.username}</p>
                  <p className="text-xs text-muted">
                    il critico · media {data.critic.avg.toFixed(1)} ⭐
                  </p>
                </div>
              </div>
            )}
            {data.generous && (
              <div className="flex items-center gap-3">
                <Avatar src={data.generous.avatarUrl} name={data.generous.username} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{data.generous.username}</p>
                  <p className="text-xs text-muted">
                    il generoso · media {data.generous.avg.toFixed(1)} ⭐
                  </p>
                </div>
              </div>
            )}
          </div>
        </StatCard>
      )}

      {/* 5. Reazione della casa */}
      {data.topReaction && (
        <StatCard index={cardIndex++}>
          <CardTitle>Reazione della casa</CardTitle>
          <div className="mt-4 flex items-center gap-4">
            <span className="text-5xl">{data.topReaction.emoji}</span>
            <p className="text-sm text-muted">usata {data.topReaction.count} volte</p>
          </div>
        </StatCard>
      )}

      {/* 6. Intesa di coppia (swipe) */}
      {(data.bestPair || data.worstPair) && (
        <StatCard index={cardIndex++}>
          <CardTitle>Intesa di coppia</CardTitle>
          <div className="mt-4 space-y-3">
            {data.bestPair && (
              <p className="flex items-center gap-2 text-sm">
                <MessageCircleHeart className="size-4 shrink-0 text-accent-red" />
                <span>
                  <span className="font-semibold">
                    {data.bestPair.a} e {data.bestPair.b}
                  </span>
                  : {data.bestPair.pct.toFixed(0)}% d&apos;accordo 💘
                </span>
              </p>
            )}
            {data.worstPair && (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Users className="size-4 shrink-0" />
                <span>
                  <span className="font-semibold text-foreground">
                    {data.worstPair.a} e {data.worstPair.b}
                  </span>
                  : solo {data.worstPair.pct.toFixed(0)}% d&apos;accordo
                </span>
              </p>
            )}
          </div>
        </StatCard>
      )}

      {/* 7. Chi porta i film giusti */}
      {data.contributors.length > 0 && (
        <StatCard index={cardIndex++}>
          <CardTitle>Chi porta i film giusti</CardTitle>
          <div className="mt-4 space-y-3">
            {data.contributors.map((c) => (
              <div key={c.username} className="flex items-center gap-3">
                <Avatar src={c.avatarUrl} name={c.username} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.username}</p>
                  <p className="text-xs text-muted">
                    {c.count} {c.count === 1 ? "film" : "film"} dalle sue liste
                    {c.avgStars != null && <> · media {c.avgStars.toFixed(1)} ⭐</>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </StatCard>
      )}
    </div>
  );
}
