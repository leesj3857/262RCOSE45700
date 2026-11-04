import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, CircleAlert, Ellipsis, RotateCcw } from "lucide-react";
import { daysIn, rangeText } from "@/lib/dates";
import { DEFAULT_SCOPE, PERIODS, isDefaultScope, periodLabel, resolveRange, type PeriodId, type Scope } from "@/lib/scope";
import { DATA_END, DATA_START } from "@/mockData/events";
import { filterByScope, useAllEvents, useScopeData } from "@/state/useScopeData";
import { resetScope, setScope } from "@/state/userData";
import Chip from "./Chip";
import RangeCalendar from "./RangeCalendar";
import MoreSheet from "./MoreSheet";
import Sheet from "./Sheet";
import VehicleSwitch from "./VehicleSwitch";

function ScopeSheet({ onClose }: { onClose: () => void }) {
  const { scope } = useScopeData();
  const all = useAllEvents();
  const [draft, setDraft] = useState<Scope>(scope);

  const range = resolveRange(draft);
  const preview = filterByScope(all, draft).length;
  const counts = useMemo(
    () => ({
      period: Object.fromEntries(
        PERIODS.filter((p) => p.id !== "custom").map((p) => [p.id, filterByScope(all, { ...draft, period: p.id }).length]),
      ) as Record<string, number>,
    }),
    [all, draft],
  );

  const patch = (p: Partial<Scope>) => setDraft((d) => ({ ...d, ...p }));

  function choosePeriod(id: PeriodId) {
    if (id === "custom") {
      const r = resolveRange(draft);
      patch({ period: "custom", from: r.start, to: r.end });
    } else {
      patch({ period: id });
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="보기 기간"
      footer={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDraft(DEFAULT_SCOPE)}
            className="flex h-12 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-bold text-ink-sub active:bg-surface"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            처음으로
          </button>
          <button
            type="button"
            disabled={preview === 0}
            onClick={() => {
              setScope(draft);
              onClose();
            }}
            className="h-12 flex-1 rounded-full bg-kakao text-[15px] font-extrabold text-ink active:bg-kakao-press disabled:bg-line disabled:text-ink-muted"
          >
            {preview === 0 ? "이벤트가 없는 조건이에요" : (
              <>
                <span className="num">{preview}</span>건 보기
              </>
            )}
          </button>
        </div>
      }
    >

      <section aria-label="기간">
        <h3 className="mb-2 text-[13px] font-bold text-ink-sub">기간</h3>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <Chip
              key={p.id}
              active={draft.period === p.id}
              onClick={() => choosePeriod(p.id)}
              count={p.id === "custom" ? undefined : counts.period[p.id]}
            >
              {p.id === "custom" ? "날짜 직접 선택" : p.label}
            </Chip>
          ))}
        </div>

        {draft.period === "custom" && (
          <div className="mt-3">
            <RangeCalendar from={draft.from} to={draft.to} min={DATA_START} max={DATA_END} onChange={(from, to) => patch({ from, to })} />
          </div>
        )}

        <p className="num mt-3 flex items-center gap-1.5 rounded-[14px] bg-surface px-3.5 py-2.5 text-[13px] font-semibold text-ink-sub">
          <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
          {rangeText(range)} · {daysIn(range)}일
        </p>
      </section>

      {preview === 0 && (
        <p className="mt-5 flex items-start gap-2 rounded-[16px] bg-[#fff8ec] p-3.5 text-[13px] leading-relaxed text-ink-sub">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />이 기간에는 이벤트가 없어요
        </p>
      )}
    </Sheet>
  );
}

export default function ScopeBar() {
  const { scope, range } = useScopeData();
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const modified = !isDefaultScope(scope);

  return (
    <div className="sticky top-0 z-20 bg-page/90 px-5 pt-4 pb-2 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label={`보기 기간 ${periodLabel(scope)} ${rangeText(range)}. 눌러서 바꾸기`}
          className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-white pr-3 pl-4 text-left shadow-card transition-colors active:bg-surface"
        >
          <CalendarDays className="size-[17px] shrink-0 text-ink-sub" aria-hidden="true" />
          <span className="text-[14px] font-extrabold whitespace-nowrap">{periodLabel(scope)}</span>
          <ChevronDown className="ml-auto size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        </button>
        {modified && (
          <button
            type="button"
            onClick={resetScope}
            aria-label="보기 기간을 이번 주로 되돌리기"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-kakao active:bg-kakao-press"
          >
            <RotateCcw className="size-[17px]" aria-hidden="true" />
          </button>
        )}
        <VehicleSwitch />
        <button
          type="button"
          onClick={() => setMore(true)}
          aria-label="더보기"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white shadow-card active:bg-surface"
        >
          <Ellipsis className="size-5" aria-hidden="true" />
        </button>
      </div>
      {open && <ScopeSheet onClose={() => setOpen(false)} />}
      <MoreSheet open={more} onClose={() => setMore(false)} />
    </div>
  );
}
