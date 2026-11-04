import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Hand, MapPinOff, Repeat, SlidersHorizontal } from "lucide-react";
import type { AreaId, CauseId } from "@/types/analytics";
import { CAUSE_BY_ID, pctChange, zoneCauseSeries, zoneCounts } from "@/lib/analytics";
import { daysIn } from "@/lib/dates";
import { eventsHref } from "@/lib/filters";
import type { HashRoute } from "@/lib/useHashRoute";
import { ZONE_BY_ID } from "@/lib/zones";
import { AREAS, CAUSES, ZONES } from "@/mockData/taxonomy";
import { useScopeData } from "@/state/useScopeData";
import Chip from "./parts/Chip";
import Delta from "./parts/Delta";
import EmptyState from "./parts/EmptyState";
import EventRow from "./parts/EventRow";
import PageHeader from "./parts/PageHeader";
import ScopeBar from "./parts/ScopeBar";
import Sheet from "./parts/Sheet";
import Segmented from "./parts/Segmented";
import Sparkline from "./parts/Sparkline";
import ZoneMap, { type MapMode } from "./parts/ZoneMap";

const MODES: { id: MapMode; label: string }[] = [
  { id: "count", label: "건수" },
  { id: "heat", label: "히트맵" },
  { id: "events", label: "개별 이벤트" },
];

export default function MapView({ route }: { route: HashRoute }) {
  const { range, events, baseline, scopedAll } = useScopeData();
  const zoneParam = route.params.get("zone");
  const eventParam = route.params.get("event");

  const initialArea: AreaId = zoneParam && ZONE_BY_ID[zoneParam] ? ZONE_BY_ID[zoneParam].area : "gangnam";
  const [area, setArea] = useState<AreaId>(initialArea);
  const [mode, setMode] = useState<MapMode>(eventParam ? "events" : "count");
  const [cause, setCause] = useState<CauseId | "all">("all");
  const [highOnly, setHighOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(zoneParam);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(eventParam);
  const [focus, setFocus] = useState<string | null>(zoneParam);

  useEffect(() => {
    if (zoneParam && ZONE_BY_ID[zoneParam]) {
      setArea(ZONE_BY_ID[zoneParam].area);
      setSelectedZone(zoneParam);
      setFocus(zoneParam);
    }
    if (eventParam) {
      setSelectedEvent(eventParam);
      setMode("events");
    }
  }, [zoneParam, eventParam]);

  const filtered = useMemo(() => events.filter((e) => (cause === "all" || e.cause === cause) && (!highOnly || e.severity === "high")), [events, cause, highOnly]);
  const baselineFiltered = useMemo(
    () => (baseline ? baseline.filter((e) => (cause === "all" || e.cause === cause) && (!highOnly || e.severity === "high")) : null),
    [baseline, cause, highOnly],
  );
  const counts = useMemo(() => zoneCounts(filtered), [filtered]);
  const areaZones = useMemo(() => ZONES.filter((z) => z.area === area), [area]);
  const ranking = useMemo(
    () => [...areaZones].map((z) => ({ zone: z, n: counts.get(z.id)?.length ?? 0 })).sort((a, b) => b.n - a.n),
    [areaZones, counts],
  );
  const areaTotal = ranking.reduce((a, r) => a + r.n, 0);
  const threshold = Math.max(3, Math.round((8 * daysIn(range)) / 7));
  const maxN = Math.max(1, ranking[0]?.n ?? 1);

  const zone = selectedZone ? ZONE_BY_ID[selectedZone] : null;
  const zoneEvents = zone ? (counts.get(zone.id) ?? []) : [];
  const latest = [...zoneEvents].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 3);
  const zonePrev = zone && baselineFiltered ? baselineFiltered.filter((e) => e.zoneId === zone.id).length : null;
  const causeTally = new Map<CauseId, number>();
  zoneEvents.forEach((e) => causeTally.set(e.cause, (causeTally.get(e.cause) ?? 0) + 1));
  const causeRows = [...causeTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const pickedEvent = selectedEvent ? (filtered.find((e) => e.id === selectedEvent) ?? scopedAll.find((e) => e.id === selectedEvent) ?? null) : null;

  function pickArea(next: AreaId) {
    setArea(next);
    const top = ZONES.filter((z) => z.area === next)
      .map((z) => ({ z, n: counts.get(z.id)?.length ?? 0 }))
      .sort((a, b) => b.n - a.n)[0];
    setSelectedZone(top?.z.id ?? null);
    setSelectedEvent(null);
    setFocus(null);
  }

  function pickZone(id: string) {
    setSelectedZone(id);
    setSelectedEvent(null);
  }

  return (
    <>
      <PageHeader title="지도" sub="어느 곳에서 많이 생기는지 위치로 봐요" />
      <ScopeBar />

      <div className="flex flex-col gap-3 px-5 pt-4 pb-10">
        <Segmented label="지역" value={area} onChange={pickArea} options={AREAS.map((a) => ({ id: a.id, label: a.label }))} />

        <Segmented label="지도 표시 방식" value={mode} onChange={setMode} options={MODES} />

        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          aria-haspopup="dialog"
          className="flex h-12 items-center gap-2 rounded-full border border-line px-4 text-left active:bg-surface"
        >
          <SlidersHorizontal className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-[14px] font-bold">
            {cause === "all" ? "모든 원인" : CAUSE_BY_ID[cause].label}
            {highOnly ? " · 사고만" : ""}
          </span>
          <span className="text-[13px] font-semibold text-ink-muted">조건 바꾸기</span>
        </button>

        <ZoneMap
          area={area}
          events={filtered}
          mode={mode}
          selectedZone={selectedZone}
          onSelectZone={pickZone}
          selectedEvent={selectedEvent}
          onSelectEvent={(id) => {
            setSelectedEvent(id);
            const ev = filtered.find((e) => e.id === id);
            if (ev) setSelectedZone(ev.zoneId);
          }}
          focusZone={focus}
          repeatThreshold={threshold}
        />

        <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-ink-muted">
          <Hand className="size-3.5" aria-hidden="true" />
          {mode === "events" ? "확대해서 점을 누르면 이벤트를 볼 수 있어요" : mode === "heat" ? "붉을수록 이벤트가 몰린 곳이에요" : `원이 클수록 많이 발생 · 점선 = 반복 구간(${threshold}건 이상)`}
        </p>

        {areaTotal === 0 && (
          <EmptyState
            icon={<MapPinOff className="size-6" aria-hidden="true" />}
            title="이 지역에는 표시할 이벤트가 없어요"
            description="다른 지역을 고르거나 원인 조건과 보기 기간을 바꿔 보세요."
          />
        )}

        {zone && mode !== "events" && (
          <section aria-label="선택한 구간" className="rounded-panel bg-navy p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[18px] font-extrabold">{zone.name}</p>
                <p className="mt-0.5 truncate text-[12px] text-white/60">{zone.address}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="num text-[34px] leading-none font-extrabold text-kakao">
                  {zoneEvents.length}
                  <span className="ml-0.5 text-[15px] font-bold text-white">건</span>
                </p>
                <div className="mt-1 flex justify-end [&_span]:text-white/80">
                  <Delta pct={pctChange(zoneEvents.length, zonePrev)} />
                </div>
              </div>
            </div>

            {zoneEvents.length >= threshold && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-bold">
                <Repeat className="size-3.5 text-kakao" strokeWidth={2.6} aria-hidden="true" />
                반복 구간
              </p>
            )}

            {causeRows.length > 0 && (
              <ul className="mt-4 flex flex-col gap-2">
                {causeRows.map(([c, n]) => (
                  <li key={c} className="flex items-center gap-3 text-[13px]">
                    <span className="w-[108px] shrink-0 text-white/80">{CAUSE_BY_ID[c].label}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/12">
                      <span className="block h-full rounded-full bg-kakao" style={{ width: `${(n / zoneEvents.length) * 100}%` }} />
                    </span>
                    <span className="num w-7 text-right font-bold">{n}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex items-center justify-between rounded-[16px] bg-white/8 px-4 py-3">
              <span className="text-[12px] font-semibold text-white/70">최근 8주 추이</span>
              <Sparkline values={zoneCauseSeries(scopedAll, zone.id, cause === "all" ? undefined : cause)} stroke="#fee500" dot="#fee500" label="최근 8주 추이" width={120} />
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {latest.map((e) => (
                <div key={e.id} className="text-ink">
                  <EventRow event={e} showDate />
                </div>
              ))}
            </div>
            <a
              href={`#${eventsHref({ zone: [zone.id], cause: cause === "all" ? [] : [cause] })}`}
              className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full bg-kakao text-[15px] font-extrabold text-ink active:bg-kakao-press"
            >
              이 구간 이벤트 {zoneEvents.length}건 보기
              <ArrowRight className="size-4" strokeWidth={2.6} aria-hidden="true" />
            </a>
          </section>
        )}

        {mode === "events" && (
          <section aria-label="선택한 이벤트" className="flex flex-col gap-2.5">
            {pickedEvent ? (
              <EventRow event={pickedEvent} showDate />
            ) : (
              <p className="rounded-[20px] bg-surface px-4 py-6 text-center text-[14px] text-ink-sub">지도에서 점을 눌러 이벤트를 확인해 보세요.</p>
            )}
            <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded-full border border-ink bg-kakao" aria-hidden="true" />
                낮음
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded-full border border-ink bg-warning" aria-hidden="true" />
                주의
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded-full border border-ink bg-danger" aria-hidden="true" />
                사고
              </span>
            </p>
          </section>
        )}

        <section aria-label="구간 순위" className="mt-2 flex flex-col gap-2">
          <h2 className="px-1 text-[18px] font-extrabold tracking-tight">
            {AREAS.find((a) => a.id === area)?.label} 구간 순위
          </h2>
          <ul className="flex flex-col rounded-panel border border-line bg-white p-2">
            {ranking.map(({ zone: z, n }, i) => {
              const on = z.id === selectedZone;
              return (
                <li key={z.id}>
                  <button
                    type="button"
                    onClick={() => {
                      pickZone(z.id);
                      setFocus(null);
                      window.setTimeout(() => setFocus(z.id), 0);
                    }}
                    aria-pressed={on}
                    className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition-colors ${on ? "bg-kakao-soft" : "active:bg-surface"}`}
                  >
                    <span className={`num flex size-8 shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold ${i === 0 ? "bg-ink text-white" : "bg-surface text-ink-sub"}`}>{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold">{z.name}</span>
                      <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-surface">
                        <span className="block h-full rounded-full bg-kakao" style={{ width: `${(n / maxN) * 100}%` }} />
                      </span>
                    </span>
                    <span className="num w-10 shrink-0 text-right text-[17px] font-extrabold">{n}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      {filterOpen && (
        <Sheet open onClose={() => setFilterOpen(false)} title="지도 조건">
          <h3 className="mb-2 text-[13px] font-bold text-ink-sub">원인</h3>
          <div className="flex flex-wrap gap-2">
            <Chip active={cause === "all"} onClick={() => setCause("all")}>
              모든 원인
            </Chip>
            {CAUSES.filter((c) => c.id !== "unknown").map((c) => (
              <Chip key={c.id} active={cause === c.id} onClick={() => setCause(c.id)}>
                {c.label}
              </Chip>
            ))}
          </div>
          <h3 className="mt-5 mb-2 text-[13px] font-bold text-ink-sub">심각도</h3>
          <div className="flex gap-2">
            <Chip active={!highOnly} onClick={() => setHighOnly(false)}>
              모두
            </Chip>
            <Chip active={highOnly} tone="kakao" onClick={() => setHighOnly(true)}>
              사고만
            </Chip>
          </div>
          <button type="button" onClick={() => setFilterOpen(false)} className="mt-6 h-12 w-full rounded-full bg-kakao text-[15px] font-extrabold active:bg-kakao-press">
            <span className="num">{filtered.length}</span>건 지도에 표시
          </button>
        </Sheet>
      )}
    </>
  );
}
