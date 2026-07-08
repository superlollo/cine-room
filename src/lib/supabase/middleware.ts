import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Prefissi delle route protette (gruppo (app) → non compaiono nell'URL).
const PROTECTED_PREFIXES = ["/home", "/lists", "/profile"];

// Pagine di autenticazione: un utente già loggato viene rimandato a /home.
const AUTH_PAGES = ["/login", "/register"];

// Aggiorna/rinfresca la sessione Supabase a ogni richiesta e protegge le route
// dell'area autenticata. Invocato dal `proxy.ts` alla root di src/.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Prima che le chiavi Supabase siano configurate, lasciamo passare tutto:
  // così l'app (landing inclusa) parte comunque in locale.
  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANTE: non inserire codice tra createServerClient e getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // Non loggato su route protetta → login.
  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Loggato su una pagina di auth → home.
  if (user && AUTH_PAGES.includes(pathname)) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/home";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return supabaseResponse;
}
