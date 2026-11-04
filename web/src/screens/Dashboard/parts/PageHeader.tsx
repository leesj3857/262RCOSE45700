import type { ReactNode } from "react";
import { shortRangeText } from "@/lib/dates";
import { useScopeData } from "@/state/useScopeData";

type Props = {
  title: string;
  right?: ReactNode;
  left?: ReactNode;
};

export default function PageHeader({ title, right, left }: Props) {
  const { range } = useScopeData();
  return (
    <header className="flex items-end justify-between gap-3 px-5 pt-4 pb-4">
      <div className="flex min-w-0 items-center gap-3">
        {left}
        <div className="min-w-0">
          <p className="num text-[13px] font-semibold text-ink-muted">{shortRangeText(range)}</p>
          <h1 className="mt-1 truncate text-[32px] leading-none font-extrabold tracking-tight">{title}</h1>
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}

