import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-foreground backdrop-blur outline-none transition placeholder:text-muted focus:border-accent-gold/50 focus:ring-2 focus:ring-accent-gold/30",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
