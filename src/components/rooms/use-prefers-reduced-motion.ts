"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

// La preferenza è uno stato esterno al React tree (e cambiabile a runtime):
// useSyncExternalStore la legge senza il giro state+effect. Lato server vale
// `false`, ma l'idratazione la corregge prima che parta qualunque animazione.
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
