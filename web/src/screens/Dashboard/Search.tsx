import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, RotateCcw, Search as SearchIcon, Sparkles } from "lucide-react";
import { searchEvents } from "@/lib/analytics";
import { EVENTS_THIS_WEEK } from "@/mockData/events";
import EventRow from "./parts/EventRow";
import PageHeader from "./parts/PageHeader";

const SUGGESTIONS = [
  "성북구 킥보드 관련 사고 찾아줘",
  "비 오는 날 이륜차 관련 급정거",
  "강남대로 보행자 무단횡단",
  "충돌 사고 보여줘",
  "안암오거리 급정거",
];

export default function Search() {
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const voiceIndex = useRef(0);
  const timer = useRef<number | null>(null);

  const result = useMemo(() => searchEvents(EVENTS_THIS_WEEK, query), [query]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  function listen() {
    if (listening) return;
    setListening(true);
    timer.current = window.setTimeout(() => {
      setQuery(SUGGESTIONS[voiceIndex.current % SUGGESTIONS.length]);
      voiceIndex.current += 1;
      setListening(false);
    }, 1500);
  }

  const hasQuery = query.trim().length > 0;

  return (
    <>
      <PageHeader eyebrow="자연어 검색" title="이슈 검색" />

      <div className="flex flex-col gap-4 px-5 pb-8">
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="flex h-14 items-center gap-2 rounded-full border border-line bg-white pr-2 pl-5 focus-within:border-ink"
        >
          <SearchIcon className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
          <input
            value={listening ? "" : query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={listening ? "듣고 있어요…" : "예) 성북구 킥보드 관련 사고 찾아줘"}
            aria-label="검색어"
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-muted"
          />
          <button
            type="button"
            onClick={listen}
            aria-label="말해서 검색"
            className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-kakao text-ink active:bg-kakao-press"
          >
            {listening && <span aria-hidden="true" className="absolute inset-0 rounded-full bg-kakao animate-pulse-ring" />}
            <Mic className="relative size-5" aria-hidden="true" />
          </button>
        </form>

        {!hasQuery && (
          <section aria-label="추천 검색어" className="flex flex-col gap-3">
            <p className="px-1 text-[13px] font-semibold text-ink-muted">이렇게 물어볼 수 있어요</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setQuery(s)}
                  className="flex items-center gap-3 rounded-[18px] bg-surface px-4 py-3.5 text-left text-[15px] font-semibold active:bg-line"
                >
                  <Sparkles className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  {s}
                </button>
              ))}
            </div>
          </section>
        )}

        {hasQuery && (
          <>
            <section aria-label="검색 해석" className="rounded-[20px] bg-kakao-soft p-4">
              <p className="text-[12px] font-bold text-ink/60">이렇게 이해했어요</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.facets.map((f) => (
                  <span key={f.key} className="inline-flex h-7 items-center rounded-full bg-kakao px-3 text-[13px] font-bold">
                    {f.label}
                  </span>
                ))}
                {result.unmatched.map((t) => (
                  <span key={t} className="inline-flex h-7 items-center rounded-full bg-white px-3 text-[13px] font-semibold text-ink-sub">
                    “{t}” 포함
                  </span>
                ))}
                {result.facets.length === 0 && result.unmatched.length === 0 && (
                  <span className="text-[13px] text-ink-sub">조건으로 바꿀 수 있는 표현이 없어요</span>
                )}
              </div>
            </section>

            <div className="flex items-center justify-between px-1">
              <h2 className="text-[16px] font-extrabold">
                검색 결과 <span className="num">{result.results.length}</span>건
              </h2>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-surface px-3 text-[13px] font-bold text-ink-sub active:bg-line"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                초기화
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {result.results.length === 0 && (
                <p className="rounded-[20px] bg-surface px-4 py-10 text-center text-[14px] text-ink-muted">
                  맞는 이벤트가 없어요. 다른 표현으로 물어보세요.
                </p>
              )}
              {result.results.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
