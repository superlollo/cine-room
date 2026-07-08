import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Unisce classi Tailwind risolvendo i conflitti (es. p-2 vs p-4).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
