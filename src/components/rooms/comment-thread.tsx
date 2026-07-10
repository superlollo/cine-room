"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { MovieComment } from "@/lib/types";
import { Avatar, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "ora";
  if (min < 60) return `${min} min fa`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ${h === 1 ? "ora" : "ore"} fa`;
  const d = Math.round(h / 24);
  return `${d} ${d === 1 ? "giorno" : "giorni"} fa`;
}

export function CommentThread({
  comments,
  currentUserId,
  disabled,
  onSend,
  onDelete,
}: {
  comments: MovieComment[];
  currentUserId: string;
  disabled?: boolean;
  onSend: (body: string) => void;
  onDelete: (commentId: string) => void;
}) {
  const [draft, setDraft] = useState("");

  function submit() {
    const body = draft.trim();
    if (!body || disabled) return;
    onSend(body);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.length === 0 ? (
        <p className="text-sm text-muted">
          Nessun commento — rompi il ghiaccio 🍿
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((c) => (
            <div key={c.id} className="group flex items-start gap-2.5">
              <Avatar src={c.avatar_url} name={c.username} size={28} />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2 text-xs">
                  <span className="font-medium text-foreground">
                    {c.username}
                  </span>
                  <span className="text-muted">
                    {relativeTime(c.created_at)}
                  </span>
                </p>
                <p className="break-words text-sm text-foreground/90">
                  {c.body}
                </p>
              </div>
              {c.user_id === currentUserId && (
                <button
                  onClick={() => onDelete(c.id)}
                  aria-label="Elimina commento"
                  className={cn(
                    "shrink-0 rounded-lg p-1 text-muted opacity-0 transition hover:bg-accent-red/10 hover:text-accent-red group-hover:opacity-100",
                    "focus-visible:opacity-100",
                  )}
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-white/10 pt-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          maxLength={500}
          disabled={disabled}
          placeholder="Scrivi un commento…"
          className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm outline-none placeholder:text-muted focus:border-accent-gold/50 disabled:opacity-50"
        />
        <button
          onClick={submit}
          disabled={disabled || !draft.trim()}
          className="flex h-10 shrink-0 items-center justify-center rounded-xl bg-accent-gradient px-4 text-sm font-semibold text-black transition hover:brightness-110 disabled:pointer-events-none disabled:opacity-50"
        >
          {disabled ? <Spinner size={16} /> : "Invia"}
        </button>
      </div>
    </div>
  );
}
