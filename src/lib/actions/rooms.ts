"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateRoomCode } from "@/lib/room-code";

// Crea una stanza con codice univoco generato server-side (retry su collisione),
// aggiunge l'host come membro e reindirizza alla stanza.
export async function createRoom(
  name: string,
): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non sei autenticato." };

  const cleanName = name.trim() || "Serata film 🍿";

  let code: string | null = null;
  let roomId: string | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = generateRoomCode();
    const { data, error } = await supabase
      .from("rooms")
      .insert({ code: candidate, name: cleanName, host_id: user.id })
      .select("id, code")
      .single();
    if (!error && data) {
      roomId = data.id;
      code = data.code;
      break;
    }
    // 23505 = unique_violation sul codice → riprova; altri errori = stop
    if (error && error.code !== "23505") {
      return { error: "Errore nella creazione della stanza." };
    }
  }

  if (!roomId || !code) return { error: "Riprova tra un istante." };

  const { error: memberError } = await supabase
    .from("room_members")
    .insert({ room_id: roomId, user_id: user.id });
  if (memberError) return { error: "Errore nell'ingresso in stanza." };

  redirect(`/room/${code}`);
}
