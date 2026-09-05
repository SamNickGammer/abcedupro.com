"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

/**
 * A drop-in replacement for the toastr.js the Blade pages used — same
 * top-right stack, same four levels, same colours — so `toastr.error(...)`
 * calls port across as `toast.error(...)` with no visual change.
 */

type Level = "success" | "error" | "info" | "warning";
type Item = { id: number; level: Level; message: string };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const COLOURS: Record<Level, string> = {
  success: "#51a351",
  error: "#bd362f",
  info: "#2f96b4",
  warning: "#f89406",
};

const ICONS: Record<Level, ReactNode> = {
  success: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  ),
  error: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />,
  info: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  ),
  warning: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.71-3.03l-6.93-11.6a2 2 0 00-3.42 0l-6.93 11.6A2 2 0 005.07 19z"
    />
  ),
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);

  const push = useCallback((level: Level, message: string) => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, level, message }]);
    setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 5000);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      info: (message) => push("info", message),
      warning: (message) => push("warning", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: "fixed",
          top: 12,
          right: 12,
          zIndex: 999999,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxWidth: "min(340px, calc(100vw - 24px))",
          pointerEvents: "none",
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            role={item.level === "error" ? "alert" : "status"}
            onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
            style={{
              pointerEvents: "auto",
              cursor: "pointer",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              background: COLOURS[item.level],
              color: "#fff",
              borderRadius: 4,
              padding: "14px 16px",
              fontSize: 14,
              lineHeight: 1.45,
              boxShadow: "0 0 12px rgba(0,0,0,0.25)",
              opacity: 0.94,
              animation: "abcToastIn .3s ease",
            }}
          >
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              style={{ flexShrink: 0, marginTop: 1 }}
              aria-hidden
            >
              {ICONS[item.level]}
            </svg>
            <span>{item.message}</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes abcToastIn{from{opacity:0;transform:translateX(24px)}to{opacity:.94;transform:none}}`}</style>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);

  // Falling back to console rather than throwing keeps a stray call from
  // taking a whole page down.
  return (
    context ?? {
      success: (message) => console.log("[toast]", message),
      error: (message) => console.error("[toast]", message),
      info: (message) => console.info("[toast]", message),
      warning: (message) => console.warn("[toast]", message),
    }
  );
}

/** Re-exported so callers can guard against SSR without importing React. */
export function useIsMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
