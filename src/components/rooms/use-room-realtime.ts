"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Sottoscrive i cambiamenti della stanza (rooms/room_members/room_exclusions)
// filtrati per room_id e invoca `onChange` a ogni evento.
export function useRoomRealtime(roomId: string, onChange: () => void) {
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const supabase = createClient();
    const handler = () => cb.current();

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` },
        handler,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        handler,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_exclusions", filter: `room_id=eq.${roomId}` },
        handler,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);
}
