"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Input, Spinner } from "@/components/ui";
import { Field } from "@/components/auth/field";

const USERNAME_RE = /^[a-zA-Z0-9]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = Partial<
  Record<"username" | "email" | "password" | "confirm", string>
>;

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!USERNAME_RE.test(username))
      e.username = "3-20 caratteri, solo lettere e numeri.";
    if (!EMAIL_RE.test(email)) e.email = "Inserisci un'email valida.";
    if (password.length < 8) e.password = "Almeno 8 caratteri.";
    if (confirm !== password) e.confirm = "Le password non coincidono.";
    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      // Check unicità username prima del signUp (messaggio pulito).
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();

      if (existing) {
        setFieldErrors({ username: "Username già in uso." });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });

      if (error) {
        // Fallback: il trigger fallisce se lo username è stato preso nel frattempo.
        setFormError(
          /duplicate|already registered|already in use/i.test(error.message)
            ? "Email o username già registrati."
            : error.message,
        );
        return;
      }

      if (data.session) {
        // Conferma email disattivata: sessione già attiva.
        router.push("/home");
        router.refresh();
      } else {
        // Conferma email attiva: mostra schermata "controlla la mail".
        setCheckEmail(true);
      }
    } finally {
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <Card className="text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-accent-gold">
          <MailCheck className="size-6" />
        </div>
        <h1 className="font-display text-xl font-semibold">Controlla la mail</h1>
        <p className="mt-2 text-sm text-muted">
          Ti abbiamo inviato un link di conferma a{" "}
          <span className="text-foreground">{email}</span>. Conferma l&apos;email
          per accedere.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-accent-gold hover:underline"
        >
          Torna al login
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="font-display text-xl font-semibold">Crea il tuo account</h1>
      <p className="mt-1 text-sm text-muted">
        Bastano pochi secondi per iniziare.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Field label="Username" error={fieldErrors.username}>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="mario99"
            autoComplete="username"
            aria-invalid={!!fieldErrors.username}
          />
        </Field>

        <Field label="Email" error={fieldErrors.email}>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
            aria-invalid={!!fieldErrors.email}
          />
        </Field>

        <Field label="Password" error={fieldErrors.password}>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Almeno 8 caratteri"
            autoComplete="new-password"
            aria-invalid={!!fieldErrors.password}
          />
        </Field>

        <Field label="Conferma password" error={fieldErrors.confirm}>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Ripeti la password"
            autoComplete="new-password"
            aria-invalid={!!fieldErrors.confirm}
          />
        </Field>

        {formError && (
          <p className="rounded-xl border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-sm text-accent-red">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Spinner />}
          {loading ? "Creazione…" : "Registrati"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Hai già un account?{" "}
        <Link href="/login" className="text-accent-gold hover:underline">
          Accedi
        </Link>
      </p>
    </Card>
  );
}
