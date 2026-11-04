import { useMemo, useState } from "react";
import { ArrowRight, Repeat } from "lucide-react";
import type { AreaId } from "@/types/analytics";
import { CAUSE_BY_ID, ZONE_BY_ID, zoneCounts } from "@/lib/analytics";
import { eventsLink } from "@/lib/useHashRoute";
import { EVENTS_THIS_WEEK } from "@/mockData/events";
import { AREAS, AREA_ROADS, ZONES } from "@/mockData/taxonomy";
import EventRow from "./parts/EventRow";
import PageHeader from "./parts/PageHeader";

const REPEAT_THRESHOLD = 8;
const counts = zoneCounts(EVENTS_THIS_WEEK);

function radius(n: number) {
  return 12 + Math.sqrt(n) * 4.6;
}

function topOf(area: AreaId): string {
  return ZONES.filter((z) => z.area === area).sort((a, b) => (counts.get(b.id)?.length ?? 0) - (counts.get(a.id)?.length ?? 0))[0].id;
}

export default function MapView() {
  const [area, setArea] = useState<AreaId>("gangnam");
  const [selected, setSelected] = useState<string>(() => topOf("gangnam"));

  const zones = useMemo(() => ZONES.filter((z) => z.area === area).sort((a, b) => Number(a.id === selected) - Number(b.id === selected)), [area, selected]);
  const roads = AREA_ROADS[area];
  const zone = ZONE_BY_ID[selected];
  const list = counts.get(selected) ?? [];
  const latest = [...list].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 2);
  const causeTally = new Map<string, number>();
  list.forEach((e) => causeTally.set(e.cause, (causeTally.get(e.cause) ?? 0) + 1));
  const topCause = [...causeTally.entries()].sort((a, b) => b[1] - a[1])[0];

  function pickArea(next: AreaId) {
    setArea(next);
    setSelected(topOf(next));
  }

  return (
    <>
      <PageHeader eyebrow="이번 주 발생 위치" title="이벤트 지도" />

      <div className="flex flex-col gap-3 px-5 pb-8">
        <div role="group" aria-label="지역" className="flex rounded-full bg-surface p-1">
          {AREAS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => pickArea(a.id)}
              className={`h-10 flex-1 rounded-full text-[14px] font-bold transition-colors ${
                area === a.id ? "bg-ink text-white" : "text-ink-muted"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-panel border border-line">
          <svg viewBox="0 0 360 420" className="block w-full bg-map-land" role="img" aria-label={`${AREAS.find((a) => a.id === area)?.label} 이벤트 발생 지도`}>
            {roads.parks.map((p, i) => (
              <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx={10} className="fill-map-park" />
            ))}
            {roads.water && <path d={roads.water} fill="none" strokeWidth={22} strokeLinecap="round" className="stroke-map-water" />}
            {roads.minor.map((d, i) => (
              <path key={i} d={d} fill="none" strokeWidth={5} className="stroke-map-road" />
            ))}
            {roads.arterial.map((d, i) => (
              <g key={i}>
                <path d={d} fill="none" strokeWidth={13} className="stroke-white" />
                <path d={d} fill="none" strokeWidth={9} className="stroke-map-arterial" />
              </g>
            ))}

            {zones.map((z) => {
              const n = counts.get(z.id)?.length ?? 0;
              const r = radius(n);
              const active = z.id === selected;
              const repeated = n >= REPEAT_THRESHOLD;
              return (
                <g
                  key={z.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${z.name} ${n}건`}
                  aria-pressed={active}
                  onClick={() => setSelected(z.id)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(z.id)}
                  className="cursor-pointer outline-none"
                >
                  {repeated && (
                    <circle cx={z.x} cy={z.y} r={r + 7} fill="none" strokeWidth={2} strokeDasharray="4 4" className="stroke-ink/60" />
                  )}
                  <circle cx={z.x} cy={z.y} r={r} className={active ? "fill-navy" : "fill-kakao"} stroke="#fff" strokeWidth={3} opacity={active ? 1 : 0.92} />
                  <text
                    x={z.x}
                    y={z.y + 6}
                    textAnchor="middle"
                    fontSize={n >= 10 ? 18 : 15}
                    fontWeight={800}
                    className={active ? "fill-kakao" : "fill-ink"}
                  >
                    {n}
                  </text>
                  <text
                    x={z.x}
                    y={z.y + r + 15}
                    textAnchor="middle"
                    fontSize={10.5}
                    fontWeight={700}
                    className="fill-ink-sub"
                    stroke="#f1f2f4"
                    strokeWidth={3.5}
                    paintOrder="stroke"
                  >
                    {z.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <p className="flex items-center justify-center gap-4 text-[12px] text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-kakao" aria-hidden="true" />
            원이 클수록 건수가 많아요
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-full border-2 border-dashed border-ink/60" aria-hidden="true" />
            반복 구간 ({REPEAT_THRESHOLD}건 이상)
          </span>
        </p>

        <section aria-label="선택한 구간" className="rounded-panel bg-navy p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[18px] font-extrabold">{zone.name}</p>
              <p className="mt-0.5 truncate text-[12px] text-white/55">{zone.address}</p>
            </div>
            <p className="num shrink-0 text-[34px] leading-none font-extrabold text-kakao">
              {list.length}
              <span className="ml-0.5 text-[15px] font-bold text-white">건</span>
            </p>
          </div>
          {topCause && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold">
              {list.length >= REPEAT_THRESHOLD && <Repeat className="size-3.5 text-kakao" strokeWidth={2.6} aria-hidden="true" />}
              최다 원인 · {CAUSE_BY_ID[topCause[0] as keyof typeof CAUSE_BY_ID].label} {topCause[1]}건
            </p>
          )}
          <div className="mt-4 flex flex-col gap-2 [&_a]:border-transparent">
            {latest.map((e) => (
              <div key={e.id} className="text-ink">
                <EventRow event={e} />
              </div>
            ))}
          </div>
          <a
            href={`#${eventsLink({ zone: zone.id })}`}
            className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full bg-kakao text-[15px] font-bold text-ink active:bg-kakao-press"
          >
            목록에서 모두 보기
            <ArrowRight className="size-4" strokeWidth={2.6} aria-hidden="true" />
          </a>
        </section>
      </div>
    </>
  );
}
