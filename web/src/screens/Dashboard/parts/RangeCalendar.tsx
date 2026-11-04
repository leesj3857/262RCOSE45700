import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  from: string;
  to: string;
  min: string;
  max: string;
  onChange: (from: string, to: string) => void;
};

const HEAD = ["일", "월", "화", "수", "목", "금", "토"];

function monthCells(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = first.getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(Date.UTC(year, month, d)).toISOString().slice(0, 10));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function RangeCalendar({ from, to, min, max, onChange }: Props) {
  const [ym, setYm] = useState(() => {
    const [y, m] = from.split("-").map(Number);
    return { y, m: m - 1 };
  });
  const [anchor, setAnchor] = useState<string | null>(null);

  const [minY, minM] = min.split("-").map(Number);
  const [maxY, maxM] = max.split("-").map(Number);
  const canPrev = ym.y > minY || (ym.y === minY && ym.m > minM - 1);
  const canNext = ym.y < maxY || (ym.y === maxY && ym.m < maxM - 1);
  const cells = monthCells(ym.y, ym.m);

  function shift(delta: number) {
    setYm((cur) => {
      const d = new Date(Date.UTC(cur.y, cur.m + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    });
  }

  function pick(day: string) {
    if (anchor === null) {
      setAnchor(day);
      onChange(day, day);
      return;
    }
    const a = anchor <= day ? anchor : day;
    const b = anchor <= day ? day : anchor;
    setAnchor(null);
    onChange(a, b);
  }

  return (
    <div className="rounded-[20px] bg-surface p-3">
      <div className="mb-1 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canPrev}
          aria-label="이전 달"
          className="flex size-11 items-center justify-center rounded-full active:bg-line disabled:opacity-30"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <p className="num text-[15px] font-extrabold" aria-live="polite">
          {ym.y}년 {ym.m + 1}월
        </p>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canNext}
          aria-label="다음 달"
          className="flex size-11 items-center justify-center rounded-full active:bg-line disabled:opacity-30"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div role="grid" aria-label="날짜 선택" className="grid grid-cols-7 gap-y-1">
        {HEAD.map((h, i) => (
          <span key={h} role="columnheader" className={`pb-1 text-center text-[12px] font-bold ${i === 0 ? "text-danger" : "text-ink-muted"}`}>
            {h}
          </span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={`e-${i}`} role="gridcell" aria-hidden="true" />;
          const disabled = day < min || day > max;
          const start = day === from;
          const end = day === to;
          const within = day >= from && day <= to;
          const isEdge = start || end;
          const roundL = start || i % 7 === 0;
          const roundR = end || i % 7 === 6;
          return (
            <button
              key={day}
              type="button"
              role="gridcell"
              disabled={disabled}
              aria-label={day.replaceAll("-", ".")}
              aria-selected={within}
              onClick={() => pick(day)}
              className={`num relative flex h-11 items-center justify-center text-[14px] font-semibold transition-colors disabled:text-ink-muted/35 ${
                within ? `bg-kakao-soft ${roundL ? "rounded-l-full" : ""} ${roundR ? "rounded-r-full" : ""}` : "rounded-full active:bg-line"
              }`}
            >
              {isEdge && <span className="absolute inset-y-0.5 left-1/2 w-10 -translate-x-1/2 rounded-full bg-ink" aria-hidden="true" />}
              <span className={`relative ${isEdge ? "font-extrabold text-white" : ""}`}>{Number(day.slice(8))}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 px-1 text-center text-[12px] text-ink-muted">{anchor ? "이제 종료일을 눌러 주세요" : "시작일과 종료일을 차례로 눌러 주세요"} · 기록이 있는 {min.slice(5).replace("-", ".")} ~ {max.slice(5).replace("-", ".")}만 고를 수 있어요</p>
    </div>
  );
}
