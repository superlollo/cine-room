"use client";

import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui";

const DISMISS_KEY = "cineroom:install-prompt-dismissed-at";
const DISMISS_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function recentlyDismissed() {
  const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
  return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

// Suggerisce l'installazione della PWA quando aperta da browser: cattura
// `beforeinstallprompt` su Android/desktop Chrome, mostra istruzioni manuali
// su iOS (Safari non supporta l'evento). Una volta installata (standalone),
// non compare più; se chiusa, non ricompare per 14 giorni.
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    if (isIos()) {
      setShowIosHint(true);
      setVisible(true);
    }

    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-sm items-start gap-3 rounded-2xl border border-white/10 bg-surface p-4 shadow-2xl shadow-black/50 backdrop-blur sm:inset-x-auto sm:right-4">
      <span className="bg-accent-gradient flex size-9 shrink-0 items-center justify-center rounded-xl">
        <Download className="size-5 text-black" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          Installa CineRoom
        </p>
        {showIosHint ? (
          <p className="mt-0.5 text-xs text-muted">
            Tocca <Share className="inline size-3.5 -translate-y-px" /> e poi
            &laquo;Aggiungi alla schermata Home&raquo;{" "}
            <SquarePlus className="inline size-3.5 -translate-y-px" />.
          </p>
        ) : (
          <>
            <p className="mt-0.5 text-xs text-muted">
              Accesso rapido dalla home, senza passare dal browser.
            </p>
            <Button onClick={install} size="sm" className="mt-3">
              Installa
            </Button>
          </>
        )}
      </div>
      <button
        onClick={dismiss}
        aria-label="Chiudi"
        className="shrink-0 rounded-lg p-1 text-muted transition hover:bg-white/10 hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
