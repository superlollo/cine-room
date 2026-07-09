import { Popcorn } from "lucide-react";
import { Card } from "@/components/ui";

// Schermata di invito (non loggato / loggato-non-membro). La CTA è passata come children.
export function RoomInvite({
  roomName,
  hostName,
  subtitle,
  children,
}: {
  roomName: string;
  hostName: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <Card className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-accent-gold">
          <Popcorn className="size-7" />
        </div>
        <p className="text-sm text-muted">Ti hanno invitato in</p>
        <h1 className="font-display text-2xl font-bold">{roomName}</h1>
        <p className="mt-1 text-sm text-muted">
          Host: <span className="text-foreground">{hostName}</span>
        </p>
        <p className="mx-auto mt-4 max-w-xs text-sm text-muted">{subtitle}</p>
        <div className="mt-6 flex justify-center">{children}</div>
      </Card>
    </div>
  );
}
