"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Spinner } from "@/components/ui";

export function JoinRoom({
  roomId,
  userId,
}: {
  roomId: string;
  userId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setJoining(true);
    setError(null);
    const { error: e } = await supabase
      .from("room_members")
      .insert({ room_id: roomId, user_id: userId });
    if (e) {
      setJoining(false);
      setError("Non sono riuscito a farti entrare. Riprova.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button onClick={join} disabled={joining} size="lg">
        {joining ? <Spinner /> : <LogIn className="size-5" />}
        Entra nella stanza
      </Button>
      {error && <p className="text-sm text-accent-red">{error}</p>}
    </div>
  );
}
