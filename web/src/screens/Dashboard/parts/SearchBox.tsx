import { useEffect, useRef, useState } from "react";
import { BookmarkCheck, Clock, Mic, Search as SearchIcon, Sparkles, X } from "lucide-react";
import { forgetSearch, prefsStore, rememberSearch } from "@/state/userData";

const SUGGESTIONS = [
  "성북구 킥보드 관련 사고 찾아줘",
  "비 오는 날 이륜차 관련 급정거",
  "강남대로 보행자 무단횡단",
  "퇴근 시간대 확인이 필요한 이벤트",
  "충돌 사고 보여줘",
];

type Props = {
  value: string;
  onChange: (q: string) => void;
  autoFocus?: boolean;
};

export default function SearchBox({ value, onChange, autoFocus = false }: Props) {
  const { recentSearches, savedSearches } = prefsStore.use();
  const [focused, setFocused] = useState(autoFocus);
  const [listening, setListening] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<number | null>(null);
  const voice = useRef(0);

  useEffect(() => {
    if (autoFocus) input.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  function choose(q: string) {
    onChange(q);
    rememberSearch(q);
    setFocused(false);
    input.current?.blur();
  }

  function listen() {
    if (listening) return;
    setListening(true);
    timer.current = window.setTimeout(() => {
      choose(SUGGESTIONS[voice.current % SUGGESTIONS.length]);
      voice.current += 1;
      setListening(false);
    }, 1400);
  }

  const showPanel = focused && !value.trim() && !listening;

  return (
    <div className="relative">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          rememberSearch(value);
          setFocused(false);
          input.current?.blur();
        }}
        className="flex h-14 items-center gap-1 rounded-full border-2 border-line bg-white pr-2 pl-5 focus-within:border-ink"
      >
        <SearchIcon className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
        <input
          ref={input}
          value={listening ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={listening ? "듣고 있어요…" : "이벤트 검색"}
          aria-label="이벤트 검색"
          enterKeyHint="search"
          className="ml-2 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-muted"
        />
        {value && !listening && (
          <button type="button" onClick={() => onChange("")} aria-label="검색어 지우기" className="flex size-10 shrink-0 items-center justify-center rounded-full active:bg-surface">
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={listen}
          aria-label="음성으로 검색"
          className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-kakao text-ink active:bg-kakao-press"
        >
          {listening && <span aria-hidden="true" className="absolute inset-0 rounded-full bg-kakao animate-pulse-ring" />}
          <Mic className="relative size-5" aria-hidden="true" />
        </button>
      </form>

      {showPanel && (
        <div
          onPointerDown={(e) => e.preventDefault()}
          className="mt-2 flex flex-col gap-4 rounded-[24px] border border-line bg-white p-4 shadow-[0_12px_32px_rgba(25,25,25,0.08)]"
        >
          {savedSearches.length > 0 && (
            <section aria-label="저장한 검색" className="flex flex-col gap-1">
              <p className="flex items-center gap-1.5 px-1 text-[12px] font-bold text-ink-muted">
                <BookmarkCheck className="size-3.5" aria-hidden="true" />
                저장한 검색
              </p>
              {savedSearches.map((s) => (
                <button key={s} type="button" onClick={() => choose(s)} className="flex min-h-11 items-center rounded-[12px] px-2 text-left text-[15px] font-semibold active:bg-surface">
                  {s}
                </button>
              ))}
            </section>
          )}
          {recentSearches.length > 0 && (
            <section aria-label="최근 검색" className="flex flex-col gap-1">
              <p className="flex items-center gap-1.5 px-1 text-[12px] font-bold text-ink-muted">
                <Clock className="size-3.5" aria-hidden="true" />
                최근 검색
              </p>
              {recentSearches.slice(0, 4).map((s) => (
                <div key={s} className="flex items-center">
                  <button type="button" onClick={() => choose(s)} className="flex min-h-11 min-w-0 flex-1 items-center rounded-[12px] px-2 text-left text-[15px] font-semibold active:bg-surface">
                    <span className="truncate">{s}</span>
                  </button>
                  <button type="button" onClick={() => forgetSearch(s)} aria-label={`${s} 삭제`} className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted active:bg-surface">
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </section>
          )}
          <section aria-label="이렇게 물어볼 수 있어요" className="flex flex-col gap-1">
            <p className="flex items-center gap-1.5 px-1 text-[12px] font-bold text-ink-muted">
              <Sparkles className="size-3.5" aria-hidden="true" />
              이렇게 물어볼 수 있어요
            </p>
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => choose(s)} className="flex min-h-11 items-center rounded-[12px] px-2 text-left text-[15px] font-semibold active:bg-surface">
                {s}
              </button>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
