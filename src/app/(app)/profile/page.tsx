import { redirect } from "next/navigation";
import { getUserCached } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const { supabase, user } = await getUserCached();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="py-6">
      <h1 className="font-display text-2xl font-bold">Profilo</h1>
      <p className="mt-1 text-sm text-muted">Gestisci il tuo account.</p>

      <ProfileForm
        userId={user.id}
        email={user.email ?? ""}
        initialUsername={profile?.username ?? ""}
        initialAvatar={profile?.avatar_url ?? null}
      />
    </div>
  );
}
