"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <span className="mb-6 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-accent-red">
        <AlertTriangle className="size-7" />
      </span>
      <h1 className="font-display text-2xl font-bold">
        Qualcosa è andato storto
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        C&apos;è stato un intoppo imprevisto. Riprova, di solito basta.
      </p>
      <div className="mt-8 flex gap-3">
        <button
          onClick={reset}
          className="bg-accent-gradient inline-flex h-12 items-center justify-center rounded-2xl px-7 font-semibold text-black shadow-lg shadow-accent-red/20 transition hover:brightness-110"
        >
          Riprova
        </button>
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-7 font-medium text-foreground backdrop-blur transition hover:bg-white/10"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
