import { notFound, redirect } from "next/navigation";
import type { Movie } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { ListDetail } from "@/components/lists/list-detail";

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS: la SELECT passa solo se l'utente è owner o membro di una stanza
  // che usa questa lista. Altrimenti null → 404.
  const { data: list } = await supabase
    .from("lists")
    .select("id, name, emoji, owner_id")
    .eq("id", id)
    .maybeSingle();

  if (!list) notFound();

  const { data: rows } = await supabase
    .from("list_movies")
    .select("added_at, movies(*)")
    .eq("list_id", id)
    .order("added_at", { ascending: false });

  const movies = (rows ?? [])
    .map((r) => r.movies as unknown as Movie)
    .filter(Boolean);

  return (
    <ListDetail
      list={{ id: list.id, name: list.name, emoji: list.emoji }}
      isOwner={list.owner_id === user.id}
      initialMovies={movies}
    />
  );
}
