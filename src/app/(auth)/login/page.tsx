"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Input, Spinner } from "@/components/ui";
import { Field } from "@/components/auth/field";
import { GoogleButton } from "@/components/auth/google-button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const redirectedFrom = searchParams.get("redirectedFrom");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setFormError(
          /invalid login credentials/i.test(error.message)
            ? "Email o password non corretti."
            : /email not confirmed/i.test(error.message)
              ? "Devi prima confermare l'email."
              : error.message,
        );
        return;
      }

      const redirectTo = searchParams.get("redirectedFrom") ?? "/home";
      router.push(redirectTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h1 className="font-display text-xl font-semibold">Bentornato</h1>
      <p className="mt-1 text-sm text-muted">Accedi per continuare.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
          />
        </Field>

        <Field label="Password">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="La tua password"
            autoComplete="current-password"
          />
        </Field>

        {formError && (
          <p className="rounded-xl border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-sm text-accent-red">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Spinner />}
          {loading ? "Accesso…" : "Accedi"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-white/10" />
        oppure
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <GoogleButton next={redirectedFrom ?? undefined} />

      <p className="mt-5 text-center text-sm text-muted">
        Non hai un account?{" "}
        <Link href="/register" className="text-accent-gold hover:underline">
          Registrati
        </Link>
      </p>
    </Card>
  );
}

export default function LoginPage() {
  // useSearchParams richiede un Suspense boundary.
  return (
    <Suspense fallback={<Card className="h-64" />}>
      <LoginForm />
    </Suspense>
  );
}
