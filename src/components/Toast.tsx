import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Notify = (msg: string) => void;
const ToastContext = createContext<Notify>(() => undefined);

export function useToast(): Notify {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const notify = useCallback<Notify>((m) => {
    setMsg(m);
    setShow(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShow(false), 2400);
  }, []);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className={`toast no-print${show ? " show" : ""}`} role="status" aria-live="polite">
        {msg}
      </div>
    </ToastContext.Provider>
  );
}
