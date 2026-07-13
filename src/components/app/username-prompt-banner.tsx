import Link from "next/link";
import { Sparkles } from "lucide-react";

// Prompt non bloccante per chi arriva da Google con uno username
// autogenerato (Giorno 14). Scompare da solo quando l'utente lo cambia
// dal profilo (username_is_generated torna false).
export function UsernamePromptBanner() {
  return (
    <Link
      href="/profile"
      className="mb-6 flex items-center gap-3 rounded-2xl border border-accent-gold/30 bg-accent-gold/10 px-4 py-3 text-sm transition hover:bg-accent-gold/15"
    >
      <Sparkles className="size-4 shrink-0 text-accent-gold" />
      <span>
        Ti abbiamo assegnato uno username temporaneo.{" "}
        <span className="font-semibold text-accent-gold">
          Scegli il tuo nome in CineRoom →
        </span>
      </span>
    </Link>
  );
}
