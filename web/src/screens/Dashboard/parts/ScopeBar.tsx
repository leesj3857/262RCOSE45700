import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, CircleAlert, RotateCcw } from "lucide-react";
import { daysIn, rangeText } from "@/lib/dates";
import { DEFAULT_SCOPE, PERIODS, isDefaultScope, periodLabel, resolveRange, type PeriodId, type Scope } from "@/lib/scope";
import { AREAS, VEHICLES } from "@/mockData/taxonomy";
import { DATA_END, DATA_START } from "@/mockData/events";
import { filterByScope, useAllEvents, useScopeData } from "@/state/useScopeData";
import { resetScope, setScope } from "@/state/userData";
import Chip from "./Chip";
import RangeCalendar from "./RangeCalendar";
import Segmented from "./Segmented";
import Sheet from "./Sheet";

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
      area: Object.fromEntries(AREAS.map((a) => [a.id, filterByScope(all, { ...draft, area: a.id }).length])) as Record<string, number>,
      areaAll: filterByScope(all, { ...draft, area: "all" }).length,
      vehicle: Object.fromEntries(VEHICLES.map((v) => [v.id, filterByScope(all, { ...draft, vehicle: v.id }).length])) as Record<string, number>,
      vehicleAll: filterByScope(all, { ...draft, vehicle: "all" }).length,
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
      title="보기 범위"
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
      <p className="mb-4 text-[13px] leading-relaxed text-ink-muted">여기서 고른 범위는 요약 · 이벤트 · 분석 · 지도에 모두 똑같이 적용돼요.</p>

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

      <section aria-label="지역" className="mt-6">
        <h3 className="mb-2 text-[13px] font-bold text-ink-sub">지역</h3>
        <Segmented
          label="지역"
          value={draft.area}
          onChange={(area) => patch({ area })}
          options={[
            { id: "all", label: `전체 ${counts.areaAll}` },
            ...AREAS.map((a) => ({ id: a.id, label: `${a.label} ${counts.area[a.id]}` })),
          ]}
        />
      </section>

      <section aria-label="차량" className="mt-6">
        <h3 className="mb-2 text-[13px] font-bold text-ink-sub">차량</h3>
        <div className="flex flex-wrap gap-2">
          <Chip active={draft.vehicle === "all"} onClick={() => patch({ vehicle: "all" })} count={counts.vehicleAll}>
            전체
          </Chip>
          {VEHICLES.map((v) => (
            <Chip key={v.id} active={draft.vehicle === v.id} onClick={() => patch({ vehicle: v.id })} count={counts.vehicle[v.id]}>
              {v.id}
            </Chip>
          ))}
        </div>
      </section>

      {preview === 0 && (
        <p className="mt-5 flex items-start gap-2 rounded-[16px] bg-[#fff8ec] p-3.5 text-[13px] leading-relaxed text-ink-sub">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />이 조건에는 기록된 이벤트가 없어요. 기간을 늘리거나 지역·차량을 바꿔 보세요. 칩 옆 숫자는 그 조건을 골랐을 때의 이벤트 수예요.
        </p>
      )}
    </Sheet>
  );
}

export default function ScopeBar() {
  const { scope, range } = useScopeData();
  const [open, setOpen] = useState(false);
  const areaLabel = AREAS.find((a) => a.id === scope.area)?.label;
  const extra = [areaLabel, scope.vehicle !== "all" ? scope.vehicle : null].filter(Boolean).join(" · ");
  const modified = !isDefaultScope(scope);

  return (
    <div className="sticky top-0 z-20 border-b border-line/70 bg-white/95 px-5 py-2.5 backdrop-blur">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label={`보기 범위 ${periodLabel(scope)} ${rangeText(range)} ${extra}. 눌러서 바꾸기`}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-full border border-line bg-white py-1.5 pr-3.5 pl-4 text-left transition-colors active:bg-surface"
        >
          <CalendarDays className="size-[18px] shrink-0 text-ink-sub" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="text-[14px] font-extrabold whitespace-nowrap">{periodLabel(scope)}</span>
              <span className="num truncate text-[12px] font-medium text-ink-muted">{rangeText(range)}</span>
            </span>
            {extra && <span className="block truncate text-[12px] font-bold text-ink">{extra}만 보는 중</span>}
          </span>
          <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        </button>
        {modified && (
          <button
            type="button"
            onClick={resetScope}
            aria-label="보기 범위를 이번 주 전체로 되돌리기"
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-kakao active:bg-kakao-press"
          >
            <RotateCcw className="size-[18px]" aria-hidden="true" />
          </button>
        )}
      </div>
      {open && <ScopeSheet onClose={() => setOpen(false)} />}
    </div>
  );
}
