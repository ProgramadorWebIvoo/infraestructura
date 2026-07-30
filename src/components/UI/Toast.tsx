import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextType = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

let nextId = 0;
const MAX_TOASTS = 5;
const TOAST_DURATION_MS = 4000;
const EXIT_ANIMATION_MS = 250;

// ── Configuration maps ──

const ICONS: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES: Record<ToastType, { container: string; progress: string; icon: string }> = {
  success: {
    container: "bg-emerald-50 border-emerald-200 text-emerald-800",
    progress: "bg-emerald-400",
    icon: "text-emerald-500",
  },
  error: {
    container: "bg-red-50 border-red-200 text-red-800",
    progress: "bg-red-400",
    icon: "text-red-500",
  },
  warning: {
    container: "bg-amber-50 border-amber-200 text-amber-800",
    progress: "bg-amber-400",
    icon: "text-amber-500",
  },
  info: {
    container: "bg-sky-50 border-sky-200 text-sky-800",
    progress: "bg-sky-400",
    icon: "text-sky-500",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const [exitingIds, setExitingIds] = useState<Set<number>>(new Set());

  // ── Dismiss (definido ANTES de showToast para evitar problemas de hoisting) ──
  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    // Marcar como "saliendo" para activar animate-slide-out-right
    setExitingIds(prev => new Set(prev).add(id));

    // Remover del DOM después de que termine la animación (250ms)
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      setExitingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, EXIT_ANIMATION_MS);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++nextId;

    setToasts(prev => {
      const next = [{ id, message, type }, ...prev];
      if (next.length > MAX_TOASTS) {
        const removed = next.splice(0, next.length - MAX_TOASTS);
        removed.forEach(t => {
          const timer = timersRef.current.get(t.id);
          if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(t.id);
          }
        });
      }
      return next;
    });

    const timer = setTimeout(() => {
      dismiss(id);
    }, TOAST_DURATION_MS);

    timersRef.current.set(id, timer);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div
        role="region"
        aria-label="Notificaciones"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-[calc(100%-2rem)] sm:w-96 pointer-events-none"
      >
        {toasts.map(toast => {
          const isExiting = exitingIds.has(toast.id);
          const Icon = ICONS[toast.type];
          const style = STYLES[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 pb-3.5 rounded-xl border text-sm font-semibold shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12)] overflow-hidden relative ${
                isExiting ? "animate-slide-out-right" : "animate-slide-in-right"
              } ${style.container}`}
              role={toast.type === "error" ? "alert" : "status"}
              aria-live={toast.type === "error" ? "assertive" : "polite"}
            >
              <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${style.icon}`} />
              <span className="flex-1 leading-snug">{toast.message}</span>
              <button
                onClick={() => dismiss(toast.id)}
                className="text-current opacity-50 hover:opacity-100 p-0.5 rounded-md hover:bg-black/5 transition-all shrink-0 self-start"
                aria-label="Cerrar notificación"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5">
                <div
                  className={`h-full rounded-full animate-toast-progress ${style.progress}`}
                  style={{ animationDuration: `${TOAST_DURATION_MS}ms` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}
