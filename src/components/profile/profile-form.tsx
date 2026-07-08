"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, Button, Card, Input, Spinner } from "@/components/ui";
import { Field } from "@/components/auth/field";
import { PRESET_AVATARS } from "@/lib/avatars";
import { cn } from "@/lib/utils";

const USERNAME_RE = /^[a-zA-Z0-9]{3,20}$/;

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

  const [username, setUsername] = useState(initialUsername);
  const [avatar, setAvatar] = useState<string | null>(initialAvatar);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const dirty = username !== initialUsername || avatar !== initialAvatar;

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
          <span className="mb-2 block text-sm font-medium text-foreground/90">
            Avatar
          </span>
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
