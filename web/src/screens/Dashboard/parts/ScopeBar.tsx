import { useState } from "react";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import { rangeText, shortDay } from "@/lib/dates";
import { DEFAULT_SCOPE, PERIODS, periodLabel, resolveRange, type PeriodId, type Scope } from "@/lib/scope";
import { AREAS, VEHICLES } from "@/mockData/taxonomy";
import { DATA_END, DATA_START } from "@/mockData/events";
import { filterByScope, useAllEvents, useScopeData } from "@/state/useScopeData";
import { setScope } from "@/state/userData";
import Segmented from "./Segmented";
import Chip from "./Chip";
import Sheet from "./Sheet";

function ScopeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { scope } = useScopeData();
  const all = useAllEvents();
  const [draft, setDraft] = useState<Scope>(scope);

  const preview = filterByScope(all, draft).length;
  const range = resolveRange(draft);

  function patch(p: Partial<Scope>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function apply() {
    setScope(draft);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="보기 범위"
      footer={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDraft(DEFAULT_SCOPE)}
            className="h-12 shrink-0 rounded-full px-4 text-[14px] font-bold text-ink-sub active:bg-surface"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={apply}
            className="h-12 flex-1 rounded-full bg-kakao text-[15px] font-extrabold text-ink active:bg-kakao-press"
          >
            <span className="num">{preview}</span>건 적용하기
          </button>
        </div>
      }
    >
      <section aria-label="기간" className="mt-1">
        <h3 className="mb-2 text-[13px] font-bold text-ink-muted">기간</h3>
        <div className="grid grid-cols-2 gap-2">
          {PERIODS.map((p) => {
            const on = draft.period === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  const next: Partial<Scope> = { period: p.id as PeriodId };
                  if (p.id === "custom") {
                    const r = resolveRange(draft);
                    next.from = r.start;
                    next.to = r.end;
                  }
                  patch(next);
                }}
                aria-pressed={on}
                className={`flex flex-col items-start gap-0.5 rounded-[18px] border-2 px-4 py-3 text-left transition-colors ${
                  on ? "border-ink bg-kakao-soft" : "border-line bg-white active:bg-surface"
                }`}
              >
                <span className="text-[15px] font-extrabold">{p.label}</span>
                <span className="text-[12px] text-ink-muted">{p.hint}</span>
              </button>
            );
          })}
        </div>

        {draft.period === "custom" && (
          <div className="mt-3 flex items-center gap-2 rounded-[18px] bg-surface p-3">
            <label className="flex flex-1 flex-col gap-1 text-[12px] font-semibold text-ink-muted">
              시작일
              <input
                type="date"
                value={draft.from}
                min={DATA_START}
                max={DATA_END}
                onChange={(e) => patch({ from: e.target.value || draft.from })}
                className="h-11 rounded-[12px] border border-line bg-white px-3 text-[15px] font-semibold text-ink outline-none focus:border-ink"
              />
            </label>
            <span className="pt-5 text-ink-muted" aria-hidden="true">
              ~
            </span>
            <label className="flex flex-1 flex-col gap-1 text-[12px] font-semibold text-ink-muted">
              종료일
              <input
                type="date"
                value={draft.to}
                min={DATA_START}
                max={DATA_END}
                onChange={(e) => patch({ to: e.target.value || draft.to })}
                className="h-11 rounded-[12px] border border-line bg-white px-3 text-[15px] font-semibold text-ink outline-none focus:border-ink"
              />
            </label>
          </div>
        )}
        <p className="num mt-2 px-1 text-[12px] text-ink-muted">
          선택: {rangeText(range)} · 수집 기간 {shortDay(DATA_START)} ~ {shortDay(DATA_END)}
        </p>
      </section>

      <section aria-label="지역" className="mt-5">
        <h3 className="mb-2 text-[13px] font-bold text-ink-muted">지역</h3>
        <Segmented
          label="지역"
          value={draft.area}
          onChange={(area) => patch({ area })}
          options={[{ id: "all", label: "전체" }, ...AREAS.map((a) => ({ id: a.id, label: a.label }))]}
        />
      </section>

      <section aria-label="차량" className="mt-5">
        <h3 className="mb-2 text-[13px] font-bold text-ink-muted">차량</h3>
        <div className="flex flex-wrap gap-2">
          <Chip active={draft.vehicle === "all"} onClick={() => patch({ vehicle: "all" })}>
            전체
          </Chip>
          {VEHICLES.map((v) => (
            <Chip key={v.id} active={draft.vehicle === v.id} onClick={() => patch({ vehicle: v.id })}>
              {v.id}
            </Chip>
          ))}
        </div>
      </section>
    </Sheet>
  );
}

export default function ScopeBar() {
  const { scope, range } = useScopeData();
  const [open, setOpen] = useState(false);
  const areaLabel = AREAS.find((a) => a.id === scope.area)?.label;

  return (
    <div className="sticky top-0 z-20 flex flex-col gap-2 border-b border-line/70 bg-white/95 px-5 py-2.5 backdrop-blur">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-white pr-3 pl-4 text-left transition-colors active:bg-surface"
        >
          <CalendarDays className="size-4 shrink-0 text-ink-sub" aria-hidden="true" />
          <span className="text-[14px] font-extrabold whitespace-nowrap">{periodLabel(scope)}</span>
          <span className="num truncate text-[12px] font-medium text-ink-muted">{rangeText(range)}</span>
          <ChevronDown className="ml-auto size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        </button>
        {areaLabel && (
          <button
            type="button"
            onClick={() => setScope({ area: "all" })}
            aria-label={`${areaLabel} 필터 해제`}
            className="inline-flex h-11 shrink-0 items-center gap-1 rounded-full bg-kakao pr-2.5 pl-3.5 text-[13px] font-extrabold"
          >
            {areaLabel}
            <X className="size-3.5" strokeWidth={2.8} aria-hidden="true" />
          </button>
        )}
        {scope.vehicle !== "all" && (
          <button
            type="button"
            onClick={() => setScope({ vehicle: "all" })}
            aria-label={`${scope.vehicle} 필터 해제`}
            className="inline-flex h-11 shrink-0 items-center gap-1 rounded-full bg-kakao pr-2.5 pl-3.5 text-[13px] font-extrabold"
          >
            {scope.vehicle}
            <X className="size-3.5" strokeWidth={2.8} aria-hidden="true" />
          </button>
        )}
      </div>
      {open && <ScopeSheet open={open} onClose={() => setOpen(false)} />}
    </div>
  );
}
