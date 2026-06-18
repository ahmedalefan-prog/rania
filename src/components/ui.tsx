"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

// ===== Toast =====
type ToastType = "success" | "error" | "info";
interface ToastItem { id: number; msg: string; type: ToastType; }

// ===== Confirm =====
interface ConfirmOpts {
  title: string;
  body?: string;
  confirmText?: string;
  danger?: boolean;
}

interface UICtx {
  toast: (msg: string, type?: ToastType) => void;
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
}
const Ctx = createContext<UICtx>({ toast: () => {}, confirm: async () => false });
export const useUI = () => useContext(Ctx);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<(ConfirmOpts & { id: number }) | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const idRef = useRef(0);

  const toast = useCallback((msg: string, type: ToastType = "success") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const confirm = useCallback((opts: ConfirmOpts) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setConfirmState({ ...opts, id: ++idRef.current });
    });
  }, []);

  const close = (val: boolean) => {
    resolver.current?.(val);
    resolver.current = null;
    setConfirmState(null);
  };

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}

      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === "success" ? "✓" : t.type === "error" ? "⚠" : "ℹ"} {t.msg}
          </div>
        ))}
      </div>

      <div className={`overlay center ${confirmState ? "show" : ""}`}
        onClick={(e) => { if ((e.target as Element).classList.contains("overlay")) close(false); }}>
        {confirmState && (
          <div className="dialog">
            <h3>{confirmState.title}</h3>
            {confirmState.body && <p className="hint">{confirmState.body}</p>}
            <div className="sheet-actions">
              <button className={`btn ${confirmState.danger ? "btn-danger" : ""}`} onClick={() => close(true)}>
                {confirmState.confirmText ?? "تأكيد"}
              </button>
              <button className="btn btn-ghost" onClick={() => close(false)}>إلغاء</button>
            </div>
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}
