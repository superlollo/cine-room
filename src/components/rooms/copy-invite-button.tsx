"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button, useToast } from "@/components/ui";

export function CopyInviteButton({
  code,
  roomName,
}: {
  code: string;
  roomName: string;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/room/${code}`;
    // Web Share API su mobile, se disponibile.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `CineRoom — ${roomName}`,
          text: "Entra nella stanza:",
          url,
        });
        return;
      } catch {
        // condivisione annullata: nessun errore da mostrare
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiato!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossibile copiare il link.");
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={share}>
      {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
      {copied ? "Copiato" : "Copia link invito"}
    </Button>
  );
}
