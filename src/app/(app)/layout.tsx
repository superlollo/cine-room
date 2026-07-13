import { redirect } from "next/navigation";
import { getUserCached } from "@/lib/supabase/server";
import { Navbar } from "@/components/app/navbar";
import { ToastProvider } from "@/components/ui";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await getUserCached();

  // Il proxy protegge già queste route; qui è una doppia sicurezza.
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <ToastProvider>
      <div className="min-h-dvh">
        <Navbar
          username={profile?.username ?? null}
          avatar={profile?.avatar_url ?? null}
        />
        <main className="mx-auto w-full max-w-5xl px-4 pb-10 pt-6">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
