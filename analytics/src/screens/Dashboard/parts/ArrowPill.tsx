import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  href: string;
  children: ReactNode;
};

export default function ArrowPill({ href, children }: Props) {
  return (
    <a
      href={`#${href}`}
      className="inline-flex h-11 items-center gap-2 rounded-full bg-ink py-1 pr-1 pl-4 text-[14px] font-bold text-white transition-transform active:scale-[0.98]"
    >
      {children}
      <span className="flex size-9 items-center justify-center rounded-full bg-kakao text-ink">
        <ArrowRight className="size-4" strokeWidth={2.6} aria-hidden="true" />
      </span>
    </a>
  );
}
