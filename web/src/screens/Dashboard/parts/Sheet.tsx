import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export const SheetRootContext = createContext<HTMLElement | null>(null);

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function Sheet({ open, onClose, title, children, footer }: Props) {
  const root = useContext(SheetRootContext);
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open]);

  if (!open || !root) return null;

  return createPortal(
    <div className="pointer-events-auto absolute inset-0 flex items-end">
      <button type="button" aria-label="닫기" tabIndex={-1} onClick={onClose} className="sheet-backdrop absolute inset-0 bg-ink/45" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="sheet-panel relative flex max-h-[90%] w-full flex-col rounded-t-[28px] bg-white shadow-[0_-12px_40px_rgba(25,25,25,0.18)] outline-none"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line" aria-hidden="true" />
        <div className="flex shrink-0 items-center justify-between px-5 pt-3 pb-2">
          <h2 className="text-[18px] font-extrabold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex size-10 items-center justify-center rounded-full bg-surface active:bg-line"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="shrink-0 border-t border-line bg-white px-5 py-3">{footer}</div>}
      </div>
    </div>,
    root,
  );
}
