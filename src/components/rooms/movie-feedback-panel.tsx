"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MovieFeedback } from "@/lib/types";
import { rateMovie, toggleReaction, addComment, deleteComment } from "@/lib/actions/feedback";
import { useToast } from "@/components/ui";
import { StarRating } from "./star-rating";
import { ReactionBar } from "./reaction-bar";
import { CommentThread } from "./comment-thread";

// Pannello di feedback su un film visto: stelline + reazioni, e opzionalmente
// il thread commenti. Riusato inline sul "Film della serata" (senza commenti)
// e nel drawer di dettaglio della cronologia (completo).
export function MovieFeedbackPanel({
  roomId,
  movieId,
  currentUserId,
  feedback,
  showComments = true,
}: {
  roomId: string;
  movieId: number;
  currentUserId: string;
  feedback: MovieFeedback;
  showComments?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const myStars = feedback.ratings.find((r) => r.user_id === currentUserId)?.stars ?? 0;
  const average = useMemo(() => {
    if (feedback.ratings.length === 0) return null;
    const sum = feedback.ratings.reduce((acc, r) => acc + r.stars, 0);
    return sum / feedback.ratings.length;
  }, [feedback.ratings]);

  const reactionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of feedback.reactions) counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
    return counts;
  }, [feedback.reactions]);
  const myReactions = useMemo(
    () =>
      new Set(
        feedback.reactions.filter((r) => r.user_id === currentUserId).map((r) => r.emoji),
      ),
    [feedback.reactions, currentUserId],
  );

  function handleRate(stars: number) {
    startTransition(async () => {
      const res = await rateMovie(roomId, movieId, stars);
      if (res?.error) toast.error(res.error);
      router.refresh();
    });
  }

  function handleToggleReaction(emoji: string) {
    startTransition(async () => {
      const res = await toggleReaction(roomId, movieId, emoji);
      if (res?.error) toast.error(res.error);
      router.refresh();
    });
  }

  function handleSendComment(body: string) {
    startTransition(async () => {
      const res = await addComment(roomId, movieId, body);
      if (res?.error) toast.error(res.error);
      router.refresh();
    });
  }

  function handleDeleteComment(commentId: string) {
    startTransition(async () => {
      const res = await deleteComment(commentId);
      if (res?.error) toast.error(res.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <StarRating
        value={myStars}
        average={average}
        count={feedback.ratings.length}
        disabled={isPending}
        onRate={handleRate}
      />
      <ReactionBar
        counts={reactionCounts}
        mine={myReactions}
        disabled={isPending}
        onToggle={handleToggleReaction}
      />
      {showComments && (
        <CommentThread
          comments={feedback.comments}
          currentUserId={currentUserId}
          disabled={isPending}
          onSend={handleSendComment}
          onDelete={handleDeleteComment}
        />
      )}
    </div>
  );
}
