import { dismissToast, useToast } from "@/state/toast";

export default function ToastHost() {
  const toast = useToast();
  if (!toast) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-20 z-50 flex justify-center px-4">
      <div
        key={toast.id}
        role="status"
        aria-live="polite"
        className="toast-in pointer-events-auto flex max-w-full items-center gap-3 rounded-full bg-ink py-2 pr-2 pl-5 text-[14px] font-semibold text-white shadow-[0_8px_28px_rgba(25,25,25,0.3)]"
      >
        <span className="min-w-0 truncate">{toast.message}</span>
        {toast.actionLabel && (
          <button
            type="button"
            onClick={() => {
              toast.onAction?.();
              dismissToast();
            }}
            className="h-9 shrink-0 rounded-full bg-kakao px-4 text-[13px] font-extrabold text-ink active:bg-kakao-press"
          >
            {toast.actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
