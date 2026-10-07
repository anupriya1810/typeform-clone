"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Toast = { id: number; message: string; kind: "success" | "error" };
const ToastContext = createContext<(message: string, kind?: Toast["kind"]) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, kind: Toast["kind"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="animate-toast flex items-center gap-2 rounded-lg bg-ink px-4 py-3 text-sm font-medium text-white shadow-lg"
          >
            {t.kind === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-400" />
            ) : (
              <XCircle size={18} className="text-red-400" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
