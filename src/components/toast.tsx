"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  title: string;
  body?: string;
  tone: ToastTone;
};

type ToastInput = Omit<Toast, "id">;

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

const toneStyles: Record<ToastTone, string> = {
  success: "border-green bg-green text-white",
  error: "border-red-600 bg-red-600 text-white",
  info: "border-teal-100 bg-teal-50 text-brand"
};

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: ToastInput) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { ...toast, id }]);
    window.setTimeout(() => removeToast(id), 4200);
  }, [removeToast]);

  const value = useMemo(() => showToast, [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 grid w-[min(420px,calc(100vw-2rem))] gap-3">
        {toasts.map((toast) => {
          const Icon = icons[toast.tone];

          return (
            <div
              className={`pointer-events-auto motion-panel rounded-lg border p-4 shadow-lg ${toneStyles[toast.tone]}`}
              key={toast.id}
              role="status"
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 shrink-0" size={18} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{toast.title}</p>
                  {toast.body ? <p className="mt-1 text-sm leading-5 opacity-90">{toast.body}</p> : null}
                </div>
                <button
                  aria-label="Dismiss notification"
                  className="rounded-md p-1 opacity-70 transition hover:bg-white/20 hover:opacity-100"
                  onClick={() => removeToast(toast.id)}
                  type="button"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const showToast = useContext(ToastContext);
  if (!showToast) throw new Error("useToast must be used inside ToastProvider");
  return showToast;
}
