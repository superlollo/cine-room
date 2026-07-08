"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastApi {
  show: (opts: { type?: ToastType; message: string }) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve stare dentro <ToastProvider>");
  return ctx;
}

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const ICON_COLOR = {
  success: "text-accent-gold",
  error: "text-accent-red",
  info: "text-muted",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback(
    ({ type = "info", message }: { type?: ToastType; message: string }) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, type, message }]);
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 3000);
    },
    [],
  );

  const api: ToastApi = {
    show,
    success: (message) => show({ type: "success", message }),
    error: (message) => show({ type: "error", message }),
    info: (message) => show({ type: "info", message }),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", damping: 22, stiffness: 320 }}
                className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/10 bg-surface/95 px-4 py-2.5 text-sm shadow-lg shadow-black/40 backdrop-blur"
              >
                <Icon className={cn("size-4 shrink-0", ICON_COLOR[t.type])} />
                <span>{t.message}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
