import { useSyncExternalStore } from "react";

export type Toast = {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

let current: Toast | null = null;
let seq = 0;
let timer: number | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function dismissToast() {
  current = null;
  if (timer !== null) window.clearTimeout(timer);
  timer = null;
  emit();
}

export function showToast(message: string, action?: { label: string; run: () => void }) {
  seq += 1;
  current = { id: seq, message, actionLabel: action?.label, onAction: action?.run };
  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(dismissToast, action ? 6000 : 3200);
  emit();
}

export function useToast(): Toast | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => current,
  );
}
