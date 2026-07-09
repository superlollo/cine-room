"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound } from "lucide-react";
import { Button, Input } from "@/components/ui";

const CODE_RE = /^[A-Z0-9]{6}$/;

// Barra per entrare in una stanza di cui si conosce il codice (non serve
// essere già membri: /room/[code] gestisce da sé i casi non-membro/membro).
export function JoinByCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!CODE_RE.test(clean)) {
      setError("Il codice ha 6 caratteri (lettere e numeri).");
      return;
    }
    setError(null);
    router.push(`/room/${clean}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-2">
      <div className="relative">
        <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          placeholder="Codice stanza"
          maxLength={6}
          className="w-40 pl-11 font-mono tracking-wider sm:w-44"
          aria-invalid={!!error}
        />
        {error && (
          <p className="absolute left-0 top-full mt-1 whitespace-nowrap text-xs text-accent-red">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" variant="ghost" size="md">
        Entra
        <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}
