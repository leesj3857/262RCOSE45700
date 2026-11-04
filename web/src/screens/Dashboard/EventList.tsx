import { useMemo, useState, type ReactNode } from "react";
import { CalendarDays, Search, X } from "lucide-react";
import type { CauseId, EventTypeId } from "@/types/analytics";
import { CAUSE_BY_ID, filterEvents, sortEvents, type SortKey, ZONE_BY_ID } from "@/lib/analytics";
import { formatDayKey, formatDayLabel, formatRange } from "@/lib/format";
import { eventsLink, navigate, type HashRoute } from "@/lib/useHashRoute";
import { EVENTS_THIS_WEEK, THIS_WEEK } from "@/mockData/events";
import { EVENT_TYPES } from "@/mockData/taxonomy";
import EventRow from "./parts/EventRow";
import PageHeader from "./parts/PageHeader";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "latest", label: "최신순" },
  { id: "oldest", label: "오래된순" },
  { id: "severity", label: "심각도순" },
];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 shrink-0 rounded-full px-4 text-[14px] font-bold transition-colors ${
        active ? "bg-ink text-white" : "bg-surface text-ink-sub active:bg-line"
      }`}
    >
      {children}
    </button>
  );
}

export default function EventList({ route }: { route: HashRoute }) {
  const type = (route.params.get("type") as EventTypeId | null) ?? undefined;
  const cause = (route.params.get("cause") as CauseId | null) ?? undefined;
  const zone = route.params.get("zone") ?? undefined;
  const [sort, setSort] = useState<SortKey>("latest");

  const events = useMemo(() => sortEvents(filterEvents(EVENTS_THIS_WEEK, { type, cause, zone }), sort), [type, cause, zone, sort]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof events>();
    events.forEach((e) => {
      const key = formatDayKey(e.occurredAt);
      map.set(key, [...(map.get(key) ?? []), e]);
    });
    return [...map.entries()];
  }, [events]);

  const scopeChips: { label: string; clear: () => void }[] = [];
  if (zone) scopeChips.push({ label: ZONE_BY_ID[zone]?.name ?? zone, clear: () => navigate(eventsLink({ type, cause }), true) });
  if (cause) scopeChips.push({ label: CAUSE_BY_ID[cause]?.label ?? cause, clear: () => navigate(eventsLink({ type, zone }), true) });

  return (
    <>
      <PageHeader
        eyebrow="이벤트 전체 목록"
        title={`${events.length}건`}
        right={
          <a
            href="#/admin/search"
            aria-label="검색"
            className="flex size-11 items-center justify-center rounded-full bg-ink text-white active:scale-95"
          >
            <Search className="size-5" aria-hidden="true" />
          </a>
        }
      />

      <div className="flex flex-col gap-3 px-5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <span className="num inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-[13px] font-semibold text-ink-sub">
            <CalendarDays className="size-4" aria-hidden="true" />
            {formatRange(THIS_WEEK.start, THIS_WEEK.end)}
          </span>
          <div role="group" aria-label="정렬" className="flex rounded-full bg-surface p-1">
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSort(s.id)}
                className={`h-8 rounded-full px-3 text-[12px] font-bold transition-colors ${
                  sort === s.id ? "bg-white text-ink shadow-sm" : "text-ink-muted"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          <Chip active={!type} onClick={() => navigate(eventsLink({ cause, zone }), true)}>
            전체
          </Chip>
          {EVENT_TYPES.map((t) => (
            <Chip key={t.id} active={type === t.id} onClick={() => navigate(eventsLink({ type: t.id, cause, zone }), true)}>
              {t.label}
            </Chip>
          ))}
        </div>

        {scopeChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {scopeChips.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={c.clear}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-kakao pr-2.5 pl-3.5 text-[13px] font-bold"
              >
                {c.label}
                <X className="size-3.5" strokeWidth={2.8} aria-label="필터 해제" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5 px-5 pt-2 pb-8">
        {groups.length === 0 && (
          <p className="rounded-[20px] bg-surface px-4 py-10 text-center text-[14px] text-ink-muted">조건에 맞는 이벤트가 없어요</p>
        )}
        {groups.map(([day, list]) => (
          <section key={day} aria-label={formatDayLabel(list[0].occurredAt)} className="flex flex-col gap-2.5">
            <h2 className="flex items-baseline gap-2 px-1 text-[14px] font-extrabold">
              {formatDayLabel(list[0].occurredAt)}
              <span className="num text-[12px] font-semibold text-ink-muted">{list.length}건</span>
            </h2>
            {list.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
