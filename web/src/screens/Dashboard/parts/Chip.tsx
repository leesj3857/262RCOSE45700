import type { ReactNode } from "react";

type Props = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
  tone?: "ink" | "kakao";
};

export default function Chip({ active, onClick, children, count, tone = "ink" }: Props) {
  const on = tone === "kakao" ? "bg-kakao text-ink" : "bg-ink text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-bold transition-colors ${
        active ? on : "bg-surface text-ink-sub active:bg-line"
      }`}
    >
      {children}
      {count !== undefined && <span className={`num text-[12px] ${active ? "opacity-70" : "text-ink-muted"}`}>{count}</span>}
    </button>
  );
}
