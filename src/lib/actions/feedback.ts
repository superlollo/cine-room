"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidReaction } from "@/lib/reactions";

// Voto in stelline (1-5) su un film visto in una stanza. Upsert: un solo voto
// per utente/film/stanza, aggiornabile.
export async function rateMovie(
  roomId: string,
  movieId: number,
  stars: number,
): Promise<{ error: string } | void> {
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return { error: "Voto non valido." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non sei autenticato." };

  const { error } = await supabase.from("movie_ratings").upsert({
    room_id: roomId,
    movie_id: movieId,
    user_id: user.id,
    stars,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Errore nel salvare il voto." };
}

// Toggle di una reazione emoji: la aggiunge se assente, la rimuove se già presente.
export async function toggleReaction(
  roomId: string,
  movieId: number,
  emoji: string,
): Promise<{ error: string } | void> {
  if (!isValidReaction(emoji)) return { error: "Reazione non valida." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non sei autenticato." };

  const { data: existing } = await supabase
    .from("movie_reactions")
    .select("emoji")
    .eq("room_id", roomId)
    .eq("movie_id", movieId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("movie_reactions")
      .delete()
      .eq("room_id", roomId)
      .eq("movie_id", movieId)
      .eq("user_id", user.id)
      .eq("emoji", emoji);
    if (error) return { error: "Errore nella reazione." };
    return;
  }

  const { error } = await supabase.from("movie_reactions").insert({
    room_id: roomId,
    movie_id: movieId,
    user_id: user.id,
    emoji,
  });
  if (error) return { error: "Errore nella reazione." };
}

export async function addComment(
  roomId: string,
  movieId: number,
  body: string,
): Promise<{ error: string } | void> {
  const trimmed = body.trim();
  if (trimmed.length === 0 || trimmed.length > 500) {
    return { error: "Commento non valido." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non sei autenticato." };

  const { error } = await supabase.from("movie_comments").insert({
    room_id: roomId,
    movie_id: movieId,
    user_id: user.id,
    body: trimmed,
  });
  if (error) return { error: "Errore nell'invio del commento." };
}

// Cancella solo se proprio (RLS lo impone comunque lato DB).
export async function deleteComment(
  commentId: string,
): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non sei autenticato." };

  const { error } = await supabase
    .from("movie_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);
  if (error) return { error: "Errore nella cancellazione." };
}
