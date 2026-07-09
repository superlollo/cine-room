"use client";

import { useState } from "react";
import { Clapperboard, Plus } from "lucide-react";
import { createRoom } from "@/lib/actions/rooms";
import { Button, Input, Modal, Spinner, useToast } from "@/components/ui";

export function CreateRoomLauncher({
  variant = "cta",
}: {
  variant?: "cta" | "card";
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Serata film 🍿");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // In caso di successo l'action reindirizza (nessun ritorno).
    const res = await createRoom(name);
    if (res?.error) {
      toast.error(res.error);
      setSaving(false);
    }
  }

  return (
    <>
      {variant === "card" ? (
        <button
          onClick={() => setOpen(true)}
          className="flex min-h-[7rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-muted transition hover:border-white/25 hover:bg-white/5 hover:text-foreground"
        >
          <span className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <Plus className="size-5" />
          </span>
          <span className="text-sm font-medium">Nuova stanza</span>
        </button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Clapperboard className="size-5" />
          Crea stanza
        </Button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Crea una stanza">
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground/90">
              Nome della stanza
            </span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={60}
            />
          </label>
          <p className="text-xs text-muted">
            Riceverai un link da condividere: chi lo apre può entrare e scegliere
            una sua lista.
          </p>
          <Button type="submit" disabled={saving} className="w-full">
            {saving && <Spinner />}
            {saving ? "Creazione…" : "Crea e apri la stanza"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
