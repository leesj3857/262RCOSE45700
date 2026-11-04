import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, Clock, Mic, RotateCcw, Search as SearchIcon, SearchX, Sparkles, X } from "lucide-react";
import { searchEvents } from "@/lib/analytics";
import { navigate, type HashRoute } from "@/lib/useHashRoute";
import { eventsHref, sortEvents, type SortKey } from "@/lib/filters";
import { periodLabel } from "@/lib/scope";
import { prefsStore, forgetSearch, rememberSearch, toggleSavedSearch } from "@/state/userData";
import { showToast } from "@/state/toast";
import { useScopeData } from "@/state/useScopeData";
import Chip from "./parts/Chip";
import EmptyState from "./parts/EmptyState";
import EventRow from "./parts/EventRow";
import PageHeader from "./parts/PageHeader";
import ScopeBar from "./parts/ScopeBar";
import Segmented from "./parts/Segmented";

const SUGGESTIONS = [
  "성북구 킥보드 관련 사고 찾아줘",
  "비 오는 날 이륜차 관련 급정거",
  "강남대로 보행자 무단횡단",
  "퇴근 시간 확인 필요한 이벤트",
  "충돌 사고 보여줘",
  "안암오거리 급정거",
];

export default function Search({ route }: { route: HashRoute }) {
  const { scope, all, events } = useScopeData();
  const { recentSearches, savedSearches } = prefsStore.use();
  const [query, setQuery] = useState(route.params.get("q") ?? "");
  const [excluded, setExcluded] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [wide, setWide] = useState(false);
  const [sort, setSort] = useState<SortKey>("latest");
  const voiceIndex = useRef(0);
  const timer = useRef<number | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const pool = wide ? all : events;
  const result = useMemo(() => searchEvents(pool, query, excluded), [pool, query, excluded]);
  const results = useMemo(() => sortEvents(result.results, sort), [result.results, sort]);
  const hasQuery = query.trim().length > 0;
  const saved = savedSearches.includes(query.trim());

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    setExcluded([]);
  }, [query]);

  function run(q: string) {
    setQuery(q);
    rememberSearch(q);
  }

  function listen() {
    if (listening) return;
    setListening(true);
    timer.current = window.setTimeout(() => {
      run(SUGGESTIONS[voiceIndex.current % SUGGESTIONS.length]);
      voiceIndex.current += 1;
      setListening(false);
    }, 1500);
  }

  function toggleFacet(key: string) {
    setExcluded((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }

  return (
    <>
      <PageHeader eyebrow="자연어 검색" title="이슈 검색" />
      <ScopeBar />

      <div className="flex flex-col gap-4 px-5 pt-4 pb-10">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            rememberSearch(query);
            input.current?.blur();
          }}
          className="flex h-14 items-center gap-1 rounded-full border-2 border-line bg-white pr-2 pl-5 focus-within:border-ink"
        >
          <SearchIcon className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
          <input
            ref={input}
            value={listening ? "" : query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={listening ? "듣고 있어요…" : "예) 성북구 킥보드 관련 사고 찾아줘"}
            aria-label="검색어"
            enterKeyHint="search"
            className="ml-2 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-muted"
          />
          {hasQuery && !listening && (
            <button type="button" onClick={() => setQuery("")} aria-label="검색어 지우기" className="flex size-10 shrink-0 items-center justify-center rounded-full active:bg-surface">
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={listen}
            aria-label="말해서 검색"
            className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-kakao text-ink active:bg-kakao-press"
          >
            {listening && <span aria-hidden="true" className="absolute inset-0 rounded-full bg-kakao animate-pulse-ring" />}
            <Mic className="relative size-5" aria-hidden="true" />
          </button>
        </form>

        {!hasQuery && (
          <>
            {savedSearches.length > 0 && (
              <section aria-label="저장한 검색" className="flex flex-col gap-2">
                <p className="flex items-center gap-1.5 px-1 text-[13px] font-bold text-ink-muted">
                  <BookmarkCheck className="size-4" aria-hidden="true" />
                  저장한 검색
                </p>
                <div className="flex flex-wrap gap-2">
                  {savedSearches.map((s) => (
                    <Chip key={s} tone="kakao" active={false} onClick={() => run(s)}>
                      {s}
                    </Chip>
                  ))}
                </div>
              </section>
            )}

            {recentSearches.length > 0 && (
              <section aria-label="최근 검색" className="flex flex-col gap-1">
                <p className="flex items-center gap-1.5 px-1 text-[13px] font-bold text-ink-muted">
                  <Clock className="size-4" aria-hidden="true" />
                  최근 검색
                </p>
                <ul>
                  {recentSearches.map((s) => (
                    <li key={s} className="flex items-center">
                      <button type="button" onClick={() => run(s)} className="flex h-12 min-w-0 flex-1 items-center rounded-[14px] px-3 text-left text-[15px] font-semibold active:bg-surface">
                        <span className="truncate">{s}</span>
                      </button>
                      <button type="button" onClick={() => forgetSearch(s)} aria-label={`${s} 삭제`} className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted active:bg-surface">
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-label="추천 검색어" className="flex flex-col gap-2">
              <p className="flex items-center gap-1.5 px-1 text-[13px] font-bold text-ink-muted">
                <Sparkles className="size-4" aria-hidden="true" />
                이렇게 물어볼 수 있어요
              </p>
              <div className="flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => run(s)} className="flex min-h-12 items-center rounded-[18px] bg-surface px-4 py-3 text-left text-[15px] font-semibold active:bg-line">
                    {s}
                  </button>
                ))}
              </div>
              <p className="px-1 pt-1 text-[12px] leading-relaxed text-ink-muted">장소·원인·유형·날씨·시간대를 자유롭게 섞어서 물어보세요. 이해한 조건은 결과 위에 칩으로 보여줘요.</p>
            </section>

            <button type="button" onClick={() => navigate(eventsHref())} className="h-12 rounded-full border border-line text-[14px] font-bold text-ink-sub active:bg-surface">
              필터로 직접 찾아보기
            </button>
          </>
        )}

        {hasQuery && (
          <>
            <section aria-label="검색 해석" className="rounded-[22px] bg-kakao-soft p-4">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-bold text-ink/60">이렇게 이해했어요 · 눌러서 조건 끄기</p>
                <button
                  type="button"
                  onClick={() => {
                    toggleSavedSearch(query);
                    showToast(saved ? "저장한 검색에서 뺐어요" : "검색을 저장했어요");
                  }}
                  aria-pressed={saved}
                  className="-mr-1 flex h-9 items-center gap-1 rounded-full px-2.5 text-[12px] font-bold active:bg-white/60"
                >
                  {saved ? <BookmarkCheck className="size-4" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
                  {saved ? "저장됨" : "저장"}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.facets.map((f) => {
                  const off = excluded.includes(f.key);
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => toggleFacet(f.key)}
                      aria-pressed={!off}
                      className={`inline-flex h-9 items-center rounded-full px-3.5 text-[13px] font-bold transition-colors ${off ? "bg-white text-ink-muted line-through" : "bg-kakao text-ink"}`}
                    >
                      {f.label}
                    </button>
                  );
                })}
                {result.unmatched.map((t) => (
                  <span key={t} className="inline-flex h-9 items-center rounded-full bg-white px-3.5 text-[13px] font-semibold text-ink-sub">
                    “{t}” 포함
                  </span>
                ))}
                {result.facets.length === 0 && result.unmatched.length === 0 && <span className="text-[13px] text-ink-sub">조건으로 바꿀 수 있는 표현이 없어요</span>}
              </div>
            </section>

            <div className="flex items-center justify-between gap-2 px-1">
              <h2 className="text-[16px] font-extrabold" aria-live="polite">
                검색 결과 <span className="num">{results.length}</span>건
              </h2>
              <button type="button" onClick={() => setQuery("")} className="inline-flex h-10 items-center gap-1 rounded-full bg-surface px-3.5 text-[13px] font-bold text-ink-sub active:bg-line">
                <RotateCcw className="size-3.5" aria-hidden="true" />
                초기화
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={wide}
                onClick={() => setWide((v) => !v)}
                className="flex h-10 items-center gap-2 text-[13px] font-bold text-ink-sub"
              >
                <span className={`relative h-6 w-10 rounded-full transition-colors ${wide ? "bg-ink" : "bg-line"}`} aria-hidden="true">
                  <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${wide ? "left-[18px]" : "left-0.5"}`} />
                </span>
                {wide ? "전체 기간에서 찾는 중" : `${periodLabel(scope)} 안에서 찾는 중`}
              </button>
              <Segmented
                label="정렬"
                value={sort === "severity" ? "severity" : "latest"}
                onChange={(v) => setSort(v)}
                options={[
                  { id: "latest", label: "최신순" },
                  { id: "severity", label: "심각도순" },
                ]}
                className="w-[170px]"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              {results.length === 0 && (
                <EmptyState
                  icon={<SearchX className="size-6" aria-hidden="true" />}
                  title="맞는 이벤트가 없어요"
                  description={wide ? "다른 표현으로 물어보거나 칩을 눌러 조건을 줄여 보세요." : "전체 기간으로 넓히거나 조건 칩을 눌러 줄여 보세요."}
                  action={
                    !wide ? (
                      <button type="button" onClick={() => setWide(true)} className="h-11 rounded-full bg-ink px-5 text-[14px] font-bold text-white">
                        전체 기간에서 찾기
                      </button>
                    ) : undefined
                  }
                />
              )}
              {results.map((e) => (
                <EventRow key={e.id} event={e} showDate />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
