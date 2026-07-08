import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16: il vecchio `middleware.ts` è stato rinominato in `proxy.ts`.
// Protegge le route del gruppo (app); /room/[code] resta pubblica (Giorno 5).
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Tutte le route tranne api, static, immagini e favicon.
    // (le route /api gestiscono da sé l'eventuale auth: niente getUser per keystroke)
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
