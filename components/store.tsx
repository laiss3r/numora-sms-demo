/* eslint-disable react-hooks/set-state-in-effect -- Browser-storage hydration after SSR and persistence error reporting intentionally synchronize external state. */
"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { State } from "@/lib/types";
import { reconcile, seed } from "@/lib/demo";
import { demoStorage } from "@/lib/storage";
type Store = {
  state: State;
  now: number;
  ready: boolean;
  error: string;
  notice: string;
  admin: boolean;
  setAdmin: (v: boolean) => void;
  apply: (f: (s: State) => State, message?: string) => boolean;
  reset: () => void;
  clear: () => void;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(1793196000000);
  const [state, setState] = useState<State>(() => seed(1793196000000));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    try {
      setState(demoStorage.load());
    } catch {
      setState(seed());
      setError(
        "Saved demo data could not be read. A fresh session is loaded; storage may be unavailable.",
      );
    }
    setNow(Date.now());
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const tick = () => {
      setNow(Date.now());
      setState((s) => reconcile(s));
    };
    const id = setInterval(tick, 15000);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", tick);
    };
  }, [ready]);
  useEffect(() => {
    if (!ready) return;
    try {
      demoStorage.save(state);
    } catch {
      setError(
        "Browser storage unavailable or full. Changes will only last in this tab.",
      );
    }
    document.documentElement.classList.toggle("dark", state.profile.dark);
  }, [state, ready]);
  const apply = useCallback(
    (f: (s: State) => State, message = "Demo updated") => {
      try {
        const next = f(reconcile(state));
        setState(next);
        setError("");
        setNotice(message);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Operation failed");
        return false;
      }
    },
    [state],
  );
  const reset = () => {
    if (window.confirm("Reset all local rentals, messages and credits?")) {
      setState(seed());
      setAdmin(false);
      setNotice("Demo reset");
    }
  };
  return (
    <Context.Provider
      value={{
        state,
        now,
        ready,
        error,
        notice,
        admin,
        setAdmin,
        apply,
        reset,
        clear: () => {
          setNotice("");
          setError("");
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const s = useContext(Context);
  if (!s) throw Error("Store missing");
  return s;
}
