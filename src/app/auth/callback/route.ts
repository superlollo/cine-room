import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Callback OAuth (Google): scambia il code per una sessione e riporta
// l'utente alla destinazione richiesta (`next`, es. /room/[code] per gli
// inviti — Giorno 5), altrimenti /home.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  // Solo path relativi (mai "//host" o URL assoluti): evita open redirect.
  const next = rawNext && /^\/(?!\/)/.test(rawNext) ? rawNext : "/home";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", "oauth");
  return NextResponse.redirect(loginUrl);
}
