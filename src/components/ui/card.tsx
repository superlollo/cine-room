import { cn } from "@/lib/utils";

// Glassmorphism: bg-white/5 + backdrop-blur + bordo white/10.
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20 backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}
