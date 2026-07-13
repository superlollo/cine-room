import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client Supabase per Server Components e Route Handlers.
// `cookies()` è asincrono in Next 16, quindi questo helper è async.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` chiamato da un Server Component: si può ignorare,
            // il refresh della sessione avviene nel proxy.
          }
        },
      },
    },
  );
}

// Dedupe di createClient()+getUser() all'interno della stessa richiesta
// (layout + pagina condividono lo stesso render pass): niente rete in più
// tra request diverse, `cache()` di React resetta ad ogni richiesta.
export const getUserCached = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});
