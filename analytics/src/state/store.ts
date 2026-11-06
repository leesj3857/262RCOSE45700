import { useSyncExternalStore } from "react";

export function createStore<T extends object>(key: string | null, initial: T) {
  let state: T = initial;
  if (key) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) state = { ...initial, ...(JSON.parse(raw) as Partial<T>) };
    } catch {
      state = initial;
    }
  }
  const listeners = new Set<() => void>();

  const get = () => state;
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  };

  function emit() {
    if (key) {
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch {
        state = state;
      }
    }
    listeners.forEach((l) => l());
  }

  return {
    get,
    set(next: T | ((s: T) => T)) {
      state = typeof next === "function" ? (next as (s: T) => T)(state) : next;
      emit();
    },
    reset() {
      state = initial;
      emit();
    },
    use: () => useSyncExternalStore(subscribe, get),
  };
}
