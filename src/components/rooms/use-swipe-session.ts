"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Gemello di useRoomRealtime per il Tinder-mode: la sessione si segue per
// room_id (così si vede anche nascere quella aperta da un altro), i player per
// session_id. Cambiando sessionId il channel si ricrea con il filtro giusto.
export function useSwipeSession(
  roomId: string,
  sessionId: string | null,
  onChange: () => void,
) {
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const supabase = createClient();
    const handler = () => cb.current();

    let channel = supabase
      .channel(`swipe:${roomId}:${sessionId ?? "none"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "swipe_sessions", filter: `room_id=eq.${roomId}` },
        handler,
      );

    if (sessionId) {
      channel = channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "swipe_players", filter: `session_id=eq.${sessionId}` },
          handler,
        )
        // I voti alimentano gli avanzamenti ("Marco 15/38"): un evento per ogni
        // card swipata da chiunque, incluse le proprie (idempotente: refresh).
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "swipe_votes", filter: `session_id=eq.${sessionId}` },
          handler,
        );
    }

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, sessionId]);
}
