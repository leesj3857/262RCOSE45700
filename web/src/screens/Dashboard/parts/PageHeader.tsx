import type { ReactNode } from "react";

type Props = {
  title: string;
  sub?: string;
  eyebrow?: string;
  right?: ReactNode;
  left?: ReactNode;
};

export default function PageHeader({ eyebrow, title, sub, right, left }: Props) {
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-6 pb-4">
      <div className="flex min-w-0 items-center gap-3">
        {left}
        <div className="min-w-0">
          {eyebrow && <p className="text-[12px] font-bold tracking-[0.08em] text-ink-muted uppercase">{eyebrow}</p>}
          <h1 className="truncate text-[26px] leading-tight font-extrabold tracking-tight">{title}</h1>
          {sub && <p className="mt-0.5 text-[13px] leading-snug text-ink-sub">{sub}</p>}
        </div>
      </div>
      {right && <div className="shrink-0 pt-0.5">{right}</div>}
    </header>
  );
}
