"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Modal, Spinner, useToast } from "@/components/ui";
import { LIST_EMOJIS } from "@/lib/list-emojis";
import { cn } from "@/lib/utils";

export function NewListLauncher({
  userId,
  variant,
}: {
  userId: string;
  variant: "card" | "cta";
}) {
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string>(LIST_EMOJIS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Dai un nome alla lista.");
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error: dbError } = await supabase
      .from("lists")
      .insert({ owner_id: userId, name: name.trim(), emoji })
      .select("id")
      .single();
    setSaving(false);

    if (dbError || !data) {
      toast.error("Errore nella creazione della lista.");
      return;
    }
    toast.success("Lista creata.");
    setOpen(false);
    setName("");
    setEmoji(LIST_EMOJIS[0]);
    router.push(`/lists/${data.id}`);
  }

  return (
    <>
      {variant === "card" ? (
        <button
          onClick={() => setOpen(true)}
          className="flex min-h-[13rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-muted transition hover:border-white/25 hover:bg-white/5 hover:text-foreground"
        >
          <span className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <Plus className="size-5" />
          </span>
          <span className="text-sm font-medium">Nuova lista</span>
        </button>
      ) : (
        <Button onClick={() => setOpen(true)} size="lg">
          <Plus className="size-5" />
          Crea la tua prima lista
        </Button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nuova lista">
        <form onSubmit={create} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground/90">
              Nome
            </span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Serata horror"
              autoFocus
              maxLength={60}
            />
          </label>

          <div>
            <span className="mb-2 block text-sm font-medium text-foreground/90">
              Emoji
            </span>
            <div className="grid grid-cols-8 gap-2">
              {LIST_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-xl border text-xl transition",
                    emoji === e
                      ? "border-accent-gold/70 bg-white/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10",
                  )}
                  aria-pressed={emoji === e}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-accent-red">{error}</p>}

          <Button type="submit" disabled={saving} className="w-full">
            {saving && <Spinner />}
            {saving ? "Creazione…" : "Crea lista"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
