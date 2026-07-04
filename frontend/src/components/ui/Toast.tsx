import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { parseApiError } from "../../lib/errors";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  errorFrom: (err: unknown, fallback?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const STYLES: Record<ToastType, string> = {
  success: "bg-emerald-600 text-white",
  error: "bg-red-600 text-white",
  warning: "bg-amber-500 text-white",
  info: "bg-brand-600 text-white",
};

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  const value: ToastContextValue = {
    success: (message) => show("success", message),
    error: (message) => show("error", message),
    warning: (message) => show("warning", message),
    info: (message) => show("info", message),
    errorFrom: (err, fallback) => {
      const { message } = parseApiError(err);
      show("error", message || fallback || "Ocurrió un error");
    },
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 sm:max-w-sm pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          return (
            <div
              key={toast.id}
              className={`${STYLES[toast.type]} pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg animate-slide-up text-sm font-medium`}
              role="status"
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="flex-1 pt-0.5">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="p-0.5 rounded hover:bg-white/20 transition-colors shrink-0"
                aria-label="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
