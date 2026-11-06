import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

type Props = {
  pct: number | null;
  good?: "down" | "up";
  suffix?: string;
  className?: string;
};

export default function Delta({ pct, good = "down", suffix = "%", className = "" }: Props) {
  if (pct === null) return <span className={`text-[12px] font-semibold text-ink-muted ${className}`}>비교 없음</span>;
  if (pct === 0) {
    return (
      <span className={`inline-flex items-center gap-0.5 text-[12px] font-bold text-ink-muted ${className}`}>
        <Minus className="size-3.5" aria-hidden="true" />
        변동 없음
      </span>
    );
  }
  const up = pct > 0;
  const positive = good === "down" ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`num inline-flex items-center gap-0.5 text-[12px] font-bold ${positive ? "text-ok" : "text-danger"} ${className}`}>
      <Icon className="size-3.5" strokeWidth={2.6} aria-hidden="true" />
      {Math.abs(pct)}
      {suffix}
      <span className="sr-only">{up ? " 증가" : " 감소"}</span>
    </span>
  );
}
