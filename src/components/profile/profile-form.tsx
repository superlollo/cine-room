"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ImageUp, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, Button, Card, Input, Spinner, useToast } from "@/components/ui";
import { Field } from "@/components/auth/field";
import { PRESET_AVATARS } from "@/lib/avatars";
import { cn } from "@/lib/utils";

const USERNAME_RE = /^[a-zA-Z0-9]{3,20}$/;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const AVATAR_SIZE = 512;

// Resize+compressione client-side: max 512x512, output webp qualità ~0.85.
async function resizeToWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, AVATAR_SIZE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponibile");
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Conversione fallita"))),
      "image/webp",
      0.85,
    );
  });
}

export function ProfileForm({
  userId,
  email,
  initialUsername,
  initialAvatar,
}: {
  userId: string;
  email: string;
  initialUsername: string;
  initialAvatar: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(initialUsername);
  const [avatar, setAvatar] = useState<string | null>(initialAvatar);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const dirty = username !== initialUsername || avatar !== initialAvatar;

  async function onPhotoSelected(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Il file scelto non è un'immagine.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Immagine troppo grande (max 10MB).");
      return;
    }

    setUploadingPhoto(true);
    try {
      const blob = await resizeToWebp(file);
      const path = `${userId}/avatar.webp`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/webp" });
      if (uploadError) {
        toast.error("Caricamento non riuscito. Riprova.");
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatar(`${data.publicUrl}?v=${Date.now()}`);
      setSaved(false);
    } catch {
      toast.error("Caricamento non riuscito. Riprova.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function onSave(ev: React.FormEvent) {
    ev.preventDefault();
    setFieldError(undefined);
    setFormError(null);
    setSaved(false);

    if (!USERNAME_RE.test(username)) {
      setFieldError("3-20 caratteri, solo lettere e numeri.");
      return;
    }

    setSaving(true);
    try {
      // Check unicità solo se lo username è cambiato.
      if (username !== initialUsername) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", username)
          .neq("id", userId)
          .maybeSingle();
        if (existing) {
          setFieldError("Username già in uso.");
          return;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({ username, avatar_url: avatar })
        .eq("id", userId);

      if (error) {
        setFormError(
          /duplicate|unique/i.test(error.message)
            ? "Username già in uso."
            : error.message,
        );
        return;
      }

      setSaved(true);
      // Aggiorna i server components (es. avatar/username nella navbar).
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function onLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Card className="mt-6">
      <div className="flex items-center gap-4">
        <Avatar src={avatar} name={username} size={64} />
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold">
            {username || "—"}
          </p>
          <p className="truncate text-sm text-muted">{email}</p>
        </div>
      </div>

      <form onSubmit={onSave} className="mt-6 space-y-5" noValidate>
        <Field label="Username" error={fieldError}>
          <Input
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setSaved(false);
            }}
            autoComplete="username"
            aria-invalid={!!fieldError}
          />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="block text-sm font-medium text-foreground/90">
              Avatar
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex items-center gap-1.5 text-sm text-accent-gold transition hover:text-accent-gold/80 disabled:opacity-60"
            >
              {uploadingPhoto ? (
                <Spinner />
              ) : (
                <ImageUp className="size-4" />
              )}
              {uploadingPhoto ? "Caricamento…" : "Carica una foto"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onPhotoSelected}
              className="hidden"
            />
          </div>
          <div className="grid grid-cols-8 gap-2">
            {PRESET_AVATARS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setAvatar(emoji);
                  setSaved(false);
                }}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-xl border text-xl transition",
                  avatar === emoji
                    ? "border-accent-gold/70 bg-white/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10",
                )}
                aria-pressed={avatar === emoji}
                aria-label={`Avatar ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {formError && (
          <p className="rounded-xl border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-sm text-accent-red">
            {formError}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving || !dirty}>
            {saving && <Spinner />}
            {saving ? "Salvataggio…" : "Salva modifiche"}
          </Button>
          {saved && !dirty && (
            <span className="flex items-center gap-1 text-sm text-accent-gold">
              <Check className="size-4" /> Salvato
            </span>
          )}
        </div>
      </form>

      <div className="mt-8 border-t border-white/10 pt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={onLogout}
          disabled={loggingOut}
        >
          {loggingOut ? <Spinner /> : <LogOut className="size-4" />}
          Esci
        </Button>
      </div>
    </Card>
  );
}
