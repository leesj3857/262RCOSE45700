import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Check, CheckCheck, Download, FilterX, Flag, ListChecks, Search, SlidersHorizontal, X } from "lucide-react";
import { applyFilters, activeCount, describeFilters, EMPTY_FILTERS, filtersToQuery, parseFilters, SORTS, type Filters } from "@/lib/filters";
import { dayHeading, dayOf } from "@/lib/dates";
import { downloadText, eventsToCsv } from "@/lib/exporters";
import { navigate, type HashRoute } from "@/lib/useHashRoute";
import { showToast } from "@/state/toast";
import { useScopeData } from "@/state/useScopeData";
import { restoreOverlay, setStatus, snapshotOverlay } from "@/state/userData";
import type { Status } from "@/types/analytics";
import Chip from "./parts/Chip";
import EmptyState from "./parts/EmptyState";
import EventRow from "./parts/EventRow";
import FilterSheet from "./parts/FilterSheet";
import PageHeader from "./parts/PageHeader";
import ScopeBar from "./parts/ScopeBar";
import Sheet from "./parts/Sheet";

const PAGE = 30;

function go(next: Filters) {
  const q = filtersToQuery(next);
  navigate(`/admin/events${q ? `?${q}` : ""}`, true);
}

export default function EventList({ route }: { route: HashRoute }) {
  const { events } = useScopeData();
  const filters = useMemo(() => parseFilters(route.params), [route.params]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [limit, setLimit] = useState(PAGE);

  const query = filtersToQuery(filters);
  const list = useMemo(() => applyFilters(events, filters), [events, filters]);
  const chips = useMemo(() => describeFilters(filters), [filters]);
  const nActive = activeCount(filters);

  useEffect(() => {
    setLimit(PAGE);
  }, [query, events]);

  useEffect(() => {
    if (!selectMode) setPicked([]);
  }, [selectMode]);

  const counts = useMemo(
    () => ({
      new: events.filter((e) => e.status === "new").length,
      check: events.filter((e) => e.fields.some((f) => !f.value)).length,
      high: events.filter((e) => e.severity === "high").length,
      star: events.filter((e) => e.starred).length,
    }),
    [events],
  );

  const shown = list.slice(0, limit);
  const grouped = filters.sort === "latest" || filters.sort === "oldest";
  const groups = useMemo(() => {
    if (!grouped) return [["", shown] as const];
    const map = new Map<string, typeof shown>();
    shown.forEach((e) => {
      const k = dayOf(e.occurredAt);
      map.set(k, [...(map.get(k) ?? []), e]);
    });
    return [...map.entries()];
  }, [shown, grouped]);

  const sortLabel = SORTS.find((s) => s.id === filters.sort)?.label ?? "최신순";
  const toggleFlag = (key: "check" | "star") => go({ ...filters, [key]: !filters[key] });
  const toggleList = <T extends string>(key: "st" | "sev", value: T) => {
    const cur = filters[key] as T[];
    go({ ...filters, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] });
  };

  function bulk(status: Status) {
    if (picked.length === 0) return;
    const snap = snapshotOverlay(picked);
    setStatus(picked, status);
    const label = status === "reviewed" ? "검토 완료" : status === "flagged" ? "조치 필요" : "미검토";
    showToast(`${picked.length}건을 ${label}로 표시했어요`, { label: "되돌리기", run: () => restoreOverlay(snap) });
    setSelectMode(false);
  }

  function exportPicked() {
    const rows = picked.length > 0 ? list.filter((e) => picked.includes(e.id)) : list;
    downloadText(`주행이슈_${rows.length}건.csv`, eventsToCsv(rows));
    showToast(`${rows.length}건을 CSV로 내보냈어요`);
  }

  const allPicked = shown.length > 0 && shown.every((e) => picked.includes(e.id));

  return (
    <>
      <PageHeader
        eyebrow="이벤트 전체 목록"
        title={`${list.length}건`}
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectMode((v) => !v)}
              aria-pressed={selectMode}
              className={`flex h-11 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold ${selectMode ? "bg-ink text-white" : "bg-surface text-ink-sub active:bg-line"}`}
            >
              {selectMode ? <X className="size-4" aria-hidden="true" /> : <ListChecks className="size-4" aria-hidden="true" />}
              {selectMode ? "취소" : "선택"}
            </button>
            <a href="#/admin/search" aria-label="검색" className="flex size-11 items-center justify-center rounded-full bg-ink text-white active:scale-95">
              <Search className="size-5" aria-hidden="true" />
            </a>
          </div>
        }
      />
      <ScopeBar />

      <div className="flex flex-col gap-3 px-5 pt-3 pb-2">
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 py-0.5">
          <Chip active={nActive === 0} onClick={() => go({ ...EMPTY_FILTERS, sort: filters.sort })}>
            전체
          </Chip>
          <Chip active={filters.st.includes("new")} count={counts.new} onClick={() => toggleList("st", "new")}>
            미검토
          </Chip>
          <Chip active={filters.check} count={counts.check} onClick={() => toggleFlag("check")}>
            확인 필요
          </Chip>
          <Chip active={filters.sev.includes("high")} count={counts.high} onClick={() => toggleList("sev", "high")}>
            사고
          </Chip>
          <Chip active={filters.star} count={counts.star} onClick={() => toggleFlag("star")}>
            즐겨찾기
          </Chip>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            aria-haspopup="dialog"
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-line text-[14px] font-bold active:bg-surface"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            필터
            {nActive > 0 && <span className="num flex size-5 items-center justify-center rounded-full bg-kakao text-[12px] font-extrabold">{nActive}</span>}
          </button>
          <button
            type="button"
            onClick={() => setSortOpen(true)}
            aria-haspopup="dialog"
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-line text-[14px] font-bold active:bg-surface"
          >
            <ArrowUpDown className="size-4" aria-hidden="true" />
            {sortLabel}
          </button>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => go(c.clear(filters))}
                aria-label={`${c.label} 필터 해제`}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-kakao pr-2.5 pl-3.5 text-[13px] font-bold"
              >
                {c.label}
                <X className="size-3.5" strokeWidth={2.8} aria-hidden="true" />
              </button>
            ))}
            {chips.length > 1 && (
              <button
                type="button"
                onClick={() => go({ ...EMPTY_FILTERS, sort: filters.sort })}
                className="inline-flex h-9 items-center gap-1 rounded-full px-2 text-[13px] font-bold text-ink-sub active:bg-surface"
              >
                모두 지우기
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5 px-5 pt-2 pb-28" aria-live="polite">
        {list.length === 0 && (
          <EmptyState
            icon={<FilterX className="size-6" aria-hidden="true" />}
            title="조건에 맞는 이벤트가 없어요"
            description="필터를 줄이거나 위쪽 보기 범위에서 기간을 늘려 보세요."
            action={
              nActive > 0 ? (
                <button
                  type="button"
                  onClick={() => go({ ...EMPTY_FILTERS, sort: filters.sort })}
                  className="h-11 rounded-full bg-ink px-5 text-[14px] font-bold text-white"
                >
                  필터 모두 지우기
                </button>
              ) : undefined
            }
          />
        )}

        {groups.map(([day, rows]) => (
          <section key={day || "flat"} className="flex flex-col gap-2.5">
            {day && (
              <h2 className="flex items-baseline gap-2 px-1 text-[14px] font-extrabold">
                {dayHeading(day)}
                <span className="num text-[12px] font-semibold text-ink-muted">{rows.length}건</span>
              </h2>
            )}
            {rows.map((e) => (
              <EventRow
                key={e.id}
                event={e}
                ctx={query}
                showDate={!grouped}
                selectMode={selectMode}
                selected={picked.includes(e.id)}
                onToggle={(id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))}
              />
            ))}
          </section>
        ))}

        {list.length > limit && (
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE)}
            className="h-12 rounded-full border border-line text-[14px] font-bold active:bg-surface"
          >
            <span className="num">{list.length - limit}</span>건 더 보기
          </button>
        )}
      </div>

      {selectMode && (
        <div className="sticky bottom-0 z-20 border-t border-line bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mb-2 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setPicked(allPicked ? [] : shown.map((e) => e.id))}
              className="inline-flex h-9 items-center gap-1.5 text-[13px] font-bold text-ink-sub"
            >
              <span className={`flex size-5 items-center justify-center rounded-full border-2 ${allPicked ? "border-ink bg-ink text-white" : "border-line"}`}>
                {allPicked && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
              </span>
              화면의 항목 전체 선택
            </button>
            <span className="num text-[13px] font-extrabold">{picked.length}건 선택</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" disabled={picked.length === 0} onClick={() => bulk("reviewed")} className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-kakao text-[14px] font-extrabold disabled:opacity-40">
              <CheckCheck className="size-4" aria-hidden="true" />
              검토 완료
            </button>
            <button type="button" disabled={picked.length === 0} onClick={() => bulk("flagged")} className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-surface text-[14px] font-bold disabled:opacity-40">
              <Flag className="size-4" aria-hidden="true" />
              조치 필요
            </button>
            <button type="button" onClick={exportPicked} className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-surface text-[14px] font-bold">
              <Download className="size-4" aria-hidden="true" />
              CSV
            </button>
          </div>
        </div>
      )}

      {filterOpen && (
        <FilterSheet
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          filters={filters}
          onApply={go}
          count={(f) => applyFilters(events, f).length}
        />
      )}

      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} title="정렬">
        <ul className="flex flex-col gap-1.5">
          {SORTS.map((s) => {
            const on = s.id === filters.sort;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    go({ ...filters, sort: s.id });
                    setSortOpen(false);
                  }}
                  aria-pressed={on}
                  className={`flex w-full items-center justify-between rounded-[18px] border-2 px-4 py-3.5 text-left ${on ? "border-ink bg-kakao-soft" : "border-transparent bg-surface active:bg-line"}`}
                >
                  <span>
                    <span className="block text-[15px] font-extrabold">{s.label}</span>
                    <span className="block text-[12px] text-ink-muted">{s.hint}</span>
                  </span>
                  {on && <Check className="size-5" strokeWidth={2.8} aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}
