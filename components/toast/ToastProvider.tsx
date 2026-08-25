"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
};

type ToastOptions = {
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number;
};

type ToastContextValue = {
  toast: (options: ToastOptions) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 3500;
const MAX_TOASTS = 4;

function makeToastId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ToastIcon({ type }: { type: ToastType }) {
  if (type === "success") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6DDCD] text-[#111111]">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
    );
  }

  if (type === "error") {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3A1F1F] text-[#FF6B6B]">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#292929] text-[#E6DDCD]">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5" />
        <path d="M12 8h.01" />
      </svg>
    </div>
  );
}

function ToastItem({
  toast,
  onClose,
}: {
  toast: Toast & { duration: number };
  onClose: (id: string) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onClose(toast.id);
    }, toast.duration);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast.id, toast.duration, onClose]);

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      aria-live={toast.type === "error" ? "assertive" : "polite"}
      className="pointer-events-auto w-[min(420px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-white/[0.10] bg-[#181818] shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
    >
      <div className="flex items-start gap-3 p-4">
        <ToastIcon type={toast.type} />

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold leading-5 text-white">
            {toast.title}
          </p>

          {toast.message ? (
            <p className="mt-1 text-sm leading-5 text-[#8E8E8E]">
              {toast.message}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onClose(toast.id)}
          aria-label="Close notification"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#777777] transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      <div className="h-[2px] w-full bg-white/[0.05]">
        <div
          className="h-full origin-left bg-[#E6DDCD]"
          style={{
            animation: `arivo-toast-progress ${toast.duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

export function ToastProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [toasts, setToasts] = useState<
    Array<Toast & { duration: number }>
  >([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) =>
      current.filter((toast) => toast.id !== id)
    );
  }, []);

  const showToast = useCallback(
    ({
      type = "info",
      title,
      message,
      duration = DEFAULT_DURATION,
    }: ToastOptions) => {
      const id = makeToastId();

      setToasts((current) => [
        ...current.slice(-(MAX_TOASTS - 1)),
        {
          id,
          type,
          title,
          message,
          duration,
        },
      ]);
    },
    []
  );

  const success = useCallback(
    (title: string, message?: string) => {
      showToast({
        type: "success",
        title,
        message,
      });
    },
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string) => {
      showToast({
        type: "error",
        title,
        message,
      });
    },
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string) => {
      showToast({
        type: "info",
        title,
        message,
      });
    },
    [showToast]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: showToast,
      success,
      error,
      info,
    }),
    [showToast, success, error, info]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed right-5 top-5 z-[99999] flex max-w-full flex-col items-end gap-3"
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={removeToast}
          />
        ))}
      </div>

      <style jsx global>{`
        @keyframes arivo-toast-progress {
          from {
            transform: scaleX(1);
          }

          to {
            transform: scaleX(0);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error(
      "useToast must be used inside <ToastProvider>."
    );
  }

  return context;
}