import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, Bookmark, BookmarkCheck, Check, CheckCheck, Download, FilterX, Flag, ListChecks, SlidersHorizontal, X } from "lucide-react";
import {
  activeCount,
  describeFilters,
  EMPTY_FILTERS,
  listToQuery,
  parseListParams,
  relaxOptions,
  runList,
  SORTS,
  type Filters,
  type ListParams,
} from "@/lib/filters";
import { dayHeading, dayOf } from "@/lib/dates";
import { downloadText, eventsToCsv } from "@/lib/exporters";
import { navigate, type HashRoute } from "@/lib/useHashRoute";
import { showToast } from "@/state/toast";
import { filterByScope, useScopeData } from "@/state/useScopeData";
import { prefsStore, restoreOverlay, setScope, setStatus, snapshotOverlay, toggleSavedSearch } from "@/state/userData";
import type { Status } from "@/types/analytics";
import Chip from "./parts/Chip";
import EmptyState from "./parts/EmptyState";
import EventRow from "./parts/EventRow";
import FilterSheet from "./parts/FilterSheet";
import PageHeader from "./parts/PageHeader";
import ScopeBar from "./parts/ScopeBar";
import SearchBox from "./parts/SearchBox";
import Sheet from "./parts/Sheet";

const PAGE = 30;

function go(p: ListParams) {
  const q = listToQuery(p);
  navigate(`/admin/events${q ? `?${q}` : ""}`, true);
}

export default function EventList({ route }: { route: HashRoute }) {
  const { events, all, scope } = useScopeData();
  const { savedSearches } = prefsStore.use();
  const url = useMemo(() => parseListParams(route.params), [route.params]);
  const filters = url.filters;
  const ex = url.ex;
  const [q, setQ] = useState(url.q);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [limit, setLimit] = useState(PAGE);
  const timer = useRef<number | null>(null);
  const committed = useRef(url.q);
  const sentinel = useRef<HTMLDivElement>(null);
  const focusSearch = route.params.get("focus") === "1";

  const params: ListParams = { filters, q, ex };
  const query = listToQuery(params);
  const { list, search } = useMemo(() => runList(events, { filters, q, ex }), [events, filters, q, ex]);
  const chips = useMemo(() => describeFilters(filters), [filters]);
  const nActive = activeCount(filters);
  const hasSearch = q.trim().length > 0;
  const saved = savedSearches.includes(q.trim());

  useEffect(() => {
    setLimit(PAGE);
  }, [query, events]);

  useEffect(() => {
    if (url.q !== committed.current) {
      committed.current = url.q;
      setQ(url.q);
    }
  }, [url.q]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const more = list.length > limit;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !more) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setLimit((l) => l + PAGE);
      },
      { rootMargin: "500px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [more, limit]);

  const counts = useMemo(
    () => ({
      new: events.filter((e) => e.status === "new").length,
      check: events.filter((e) => e.fields.some((f) => !f.value)).length,
      high: events.filter((e) => e.severity === "high").length,
      star: events.filter((e) => e.starred).length,
    }),
    [events],
  );

  function changeQuery(next: string) {
    setQ(next);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      committed.current = next;
      go({ filters, q: next, ex: [] });
    }, 350);
  }

  function clearAll() {
    committed.current = "";
    setQ("");
    go({ filters: { ...EMPTY_FILTERS, sort: filters.sort }, q: "", ex: [] });
  }

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
  const setFilters = (next: Filters) => go({ filters: next, q, ex });
  const toggleFlag = (key: "check" | "star") => setFilters({ ...filters, [key]: !filters[key] });
  const toggleIn = <T extends string>(key: "st" | "sev", value: T) => {
    const cur = filters[key] as T[];
    setFilters({ ...filters, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] });
  };

  function bulk(status: Status) {
    if (picked.length === 0) return;
    const snap = snapshotOverlay(picked);
    setStatus(picked, status);
    const label = status === "reviewed" ? "검토 완료" : status === "flagged" ? "조치 필요" : "미검토";
    showToast(`${picked.length}건을 ${label}로 표시했어요`, { label: "되돌리기", run: () => restoreOverlay(snap) });
    setSelectMode(false);
    setPicked([]);
  }

  function exportRows() {
    const rows = picked.length > 0 ? list.filter((e) => picked.includes(e.id)) : list;
    downloadText(`주행이슈_${rows.length}건.csv`, eventsToCsv(rows));
    showToast(`${rows.length}건을 CSV로 내보냈어요`);
  }

  const relax = list.length === 0 ? relaxOptions(events, params) : [];
  const widerCount =
    list.length === 0 && scope.period !== "8w" ? runList(filterByScope(all, { ...scope, period: "8w" }), params).list.length : 0;
  const allPicked = shown.length > 0 && shown.every((e) => picked.includes(e.id));
  const filtered = nActive > 0 || hasSearch;

  return (
    <>
      <PageHeader
        title="이벤트"
        sub="기록을 찾고, 하나씩 확인해요"
        right={
          <button
            type="button"
            onClick={() => {
              setSelectMode((v) => !v);
              setPicked([]);
            }}
            aria-pressed={selectMode}
            className={`flex h-11 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold ${selectMode ? "bg-ink text-white" : "bg-surface text-ink-sub active:bg-line"}`}
          >
            {selectMode ? <X className="size-4" aria-hidden="true" /> : <ListChecks className="size-4" aria-hidden="true" />}
            {selectMode ? "선택 끝내기" : "여러 개 선택"}
          </button>
        }
      />
      <ScopeBar />

      <div className="flex flex-col gap-3 px-5 pt-4 pb-2">
        <SearchBox value={q} onChange={changeQuery} autoFocus={focusSearch} />

        {hasSearch && search && (
          <section aria-label="검색 해석" className="rounded-[22px] bg-kakao-soft p-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold text-ink/65">이렇게 이해했어요 · 눌러서 조건 끄기</p>
              <button
                type="button"
                onClick={() => {
                  toggleSavedSearch(q);
                  showToast(saved ? "저장한 검색에서 뺐어요" : "검색을 저장했어요");
                }}
                aria-pressed={saved}
                className="-mr-1 flex h-10 items-center gap-1 rounded-full px-2.5 text-[12px] font-bold active:bg-white/60"
              >
                {saved ? <BookmarkCheck className="size-4" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
                {saved ? "저장됨" : "저장"}
              </button>
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {search.facets.map((f) => {
                const off = ex.includes(f.key);
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => go({ filters, q, ex: off ? ex.filter((k) => k !== f.key) : [...ex, f.key] })}
                    aria-pressed={!off}
                    className={`inline-flex h-10 items-center rounded-full px-4 text-[13px] font-bold transition-colors ${off ? "bg-white text-ink-muted line-through" : "bg-kakao text-ink"}`}
                  >
                    {f.label}
                  </button>
                );
              })}
              {search.unmatched.map((t) => (
                <span key={t} className="inline-flex h-10 items-center rounded-full bg-white px-4 text-[13px] font-semibold text-ink-sub">
                  “{t}” 포함
                </span>
              ))}
              {search.facets.length === 0 && search.unmatched.length === 0 && <span className="text-[13px] text-ink-sub">조건으로 바꿀 수 있는 표현이 없어요</span>}
            </div>
          </section>
        )}

        {!hasSearch && (
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 py-0.5" role="group" aria-label="바로 보기">
            <Chip active={!filtered} onClick={clearAll}>
              전체
            </Chip>
            <Chip active={filters.st.includes("new")} count={counts.new} onClick={() => toggleIn("st", "new")}>
              미검토
            </Chip>
            <Chip active={filters.check} count={counts.check} onClick={() => toggleFlag("check")}>
              확인 필요
            </Chip>
            <Chip active={filters.sev.includes("high")} count={counts.high} onClick={() => toggleIn("sev", "high")}>
              사고
            </Chip>
            <Chip active={filters.star} count={counts.star} onClick={() => toggleFlag("star")}>
              즐겨찾기
            </Chip>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <p className="text-[15px] font-extrabold" aria-live="polite">
            {hasSearch ? "검색 결과 " : "총 "}
            <span className="num">{list.length}</span>건
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              aria-haspopup="dialog"
              className="flex h-11 items-center gap-1.5 rounded-full border border-line px-4 text-[14px] font-bold active:bg-surface"
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              필터
              {nActive > 0 && <span className="num flex size-5 items-center justify-center rounded-full bg-kakao text-[12px] font-extrabold">{nActive}</span>}
            </button>
            <button
              type="button"
              onClick={() => setSortOpen(true)}
              aria-haspopup="dialog"
              className="flex h-11 items-center gap-1.5 rounded-full border border-line px-4 text-[14px] font-bold active:bg-surface"
            >
              <ArrowUpDown className="size-4" aria-hidden="true" />
              {sortLabel}
            </button>
          </div>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setFilters(c.clear(filters))}
                aria-label={`${c.label} 조건 빼기`}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink pr-3 pl-4 text-[13px] font-bold text-white"
              >
                {c.label}
                <X className="size-3.5" strokeWidth={2.8} aria-hidden="true" />
              </button>
            ))}
            {chips.length > 1 && (
              <button type="button" onClick={() => setFilters({ ...EMPTY_FILTERS, sort: filters.sort })} className="inline-flex h-10 items-center rounded-full px-3 text-[13px] font-bold text-ink-sub active:bg-surface">
                모두 지우기
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5 px-5 pt-2 pb-28">
        {list.length === 0 && (
          <EmptyState
            icon={<FilterX className="size-6" aria-hidden="true" />}
            title={filtered ? "조건에 맞는 이벤트가 없어요" : "이 범위에는 이벤트가 없어요"}
            description={filtered ? "아래 방법 중 하나로 조건을 풀어 보세요." : "위의 보기 범위에서 기간이나 지역을 바꿔 보세요."}
            action={
              <div className="flex w-full min-w-[240px] flex-col gap-2">
                {relax.map((r) => (
                  <button key={r.label} type="button" onClick={() => {
                      committed.current = r.next.q;
                      setQ(r.next.q);
                      go(r.next);
                    }} className="flex min-h-12 items-center justify-between gap-3 rounded-full bg-white px-5 text-[14px] font-bold shadow-sm active:bg-line">
                    {r.label}
                    <span className="num text-ink-muted">{r.count}건</span>
                  </button>
                ))}
                {widerCount > 0 && (
                  <button type="button" onClick={() => setScope({ period: "8w" })} className="flex min-h-12 items-center justify-between gap-3 rounded-full bg-white px-5 text-[14px] font-bold shadow-sm active:bg-line">
                    전체 8주에서 찾기
                    <span className="num text-ink-muted">{widerCount}건</span>
                  </button>
                )}
                {filtered && (
                  <button type="button" onClick={clearAll} className="h-12 rounded-full bg-ink text-[14px] font-bold text-white">
                    모든 조건 지우기
                  </button>
                )}
              </div>
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

        {more && (
          <div ref={sentinel} className="flex flex-col items-center gap-2 py-2">
            <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="h-12 w-full rounded-full border border-line text-[14px] font-bold active:bg-surface">
              <span className="num">{list.length - limit}</span>건 더 보기
            </button>
          </div>
        )}
        {!more && list.length > 0 && (
          <p className="py-4 text-center text-[13px] font-semibold text-ink-muted">
            마지막 이벤트예요 · 총 <span className="num">{list.length}</span>건
          </p>
        )}
      </div>

      {selectMode && (
        <div className="sticky bottom-0 z-20 border-t border-line bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mb-2 flex items-center justify-between px-1">
            <button type="button" onClick={() => setPicked(allPicked ? [] : shown.map((e) => e.id))} className="inline-flex h-10 items-center gap-1.5 text-[13px] font-bold text-ink-sub">
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
            <button type="button" onClick={exportRows} className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-surface text-[14px] font-bold">
              <Download className="size-4" aria-hidden="true" />
              CSV
            </button>
          </div>
        </div>
      )}

      {filterOpen && (
        <FilterSheet
          onClose={() => setFilterOpen(false)}
          filters={filters}
          onApply={setFilters}
          count={(f) => runList(events, { filters: f, q, ex }).list.length}
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
                    setFilters({ ...filters, sort: s.id });
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
