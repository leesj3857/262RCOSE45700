import type { ReactNode } from "react";

type Props = {
  title: string;
  right?: ReactNode;
  left?: ReactNode;
};

export default function PageHeader({ title, right, left }: Props) {
  return (
    <header className="flex min-h-[72px] items-center justify-between gap-3 px-5 pt-3 pb-1">
      <div className="flex min-w-0 items-center gap-3">
        {left}
        <h1 className="truncate text-[24px] leading-tight font-extrabold tracking-tight">{title}</h1>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}
