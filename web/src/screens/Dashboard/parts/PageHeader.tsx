import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  right?: ReactNode;
  left?: ReactNode;
};

export default function PageHeader({ eyebrow, title, right, left }: Props) {
  return (
    <header className="flex items-end justify-between gap-3 px-5 pt-6 pb-4">
      <div className="flex min-w-0 items-center gap-3">
        {left}
        <div className="min-w-0">
          {eyebrow && <p className="text-[12px] font-bold tracking-[0.08em] text-ink-muted uppercase">{eyebrow}</p>}
          <h1 className="truncate text-[24px] leading-tight font-extrabold tracking-tight">{title}</h1>
        </div>
      </div>
      {right}
    </header>
  );
}
