import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Eye, Lightbulb, ScanText } from "lucide-react";
import type { EventTypeId, IssueEvent } from "@/types/analytics";
import {
  CAUSE_BY_ID,
  hourMatrix,
  pctChange,
  summarize,
  topWindow,
  weeklySeries,
  zoneCauseSeries,
} from "@/lib/analytics";
import { buildRecommendations } from "@/lib/recommendations";
import { weekdayLabel } from "@/lib/dates";
import { eventsHref } from "@/lib/filters";
import { navigate, type HashRoute } from "@/lib/useHashRoute";
import { ZONE_BY_ID } from "@/lib/zones";
import { AREAS, CAUSES, EVENT_TYPES, HOUR_MAX, HOUR_MIN, TYPE_COLORS } from "@/mockData/taxonomy";
import { showToast } from "@/state/toast";
import { useScopeData } from "@/state/useScopeData";
import { prefsStore, restoreRec, setScope } from "@/state/userData";
import Delta from "./parts/Delta";
import PageHeader from "./parts/PageHeader";
import RecCard from "./parts/RecCard";
import ScopeBar from "./parts/ScopeBar";
import Segmented from "./parts/Segmented";
import Sparkline from "./parts/Sparkline";

function Block({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section id={`sec-${id}`} aria-label={title} className="flex flex-col gap-3">
      <div className="px-1">
        <h2 className="text-[18px] font-extrabold tracking-tight">{title}</h2>
        {note && <p className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

const HEAT = ["#f5f6f8", "#fff6b3", "#ffee66", "#fee500", "#ffb400", "#ff7a00"];

function heatColor(v: number, max: number): string {
  if (v === 0 || max === 0) return HEAT[0];
  const r = v / max;
  return HEAT[r < 0.2 ? 1 : r < 0.4 ? 2 : r < 0.6 ? 3 : r < 0.8 ? 4 : 5];
}

function TrendChart({ events, rangeStart, rangeEnd }: { events: IssueEvent[]; rangeStart: string; rangeEnd: string }) {
  const series = useMemo(() => weeklySeries(events), [events]);
  const [stack, setStack] = useState<"total" | "type">("type");
  const [picked, setPicked] = useState(series.length - 1);
  const W = 340;
  const H = 200;
  const pad = { l: 26, r: 6, t: 20, b: 28 };
  const max = Math.max(1, ...series.map((s) => s.total));
  const yMax = Math.ceil(max / 20) * 20;
  const bw = (W - pad.l - pad.r) / series.length;
  const y = (v: number) => pad.t + (1 - v / yMax) * (H - pad.t - pad.b);
  const cur = series[picked];
  const types = [...EVENT_TYPES].reverse();

  return (
    <div className="rounded-panel bg-white shadow-card p-5">
      <Segmented
        label="막대 표시"
        value={stack}
        onChange={setStack}
        options={[
          { id: "type", label: "유형별" },
          { id: "total", label: "전체" },
        ]}
      />
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label="최근 8주 주간 이벤트 추이">
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(yMax * t)} y2={y(yMax * t)} stroke="#e8eaed" strokeWidth={1} />
            <text x={pad.l - 5} y={y(yMax * t) + 3.5} textAnchor="end" fontSize="10" fill="#6b7280" className="num">
              {Math.round(yMax * t)}
            </text>
          </g>
        ))}
        {series.map((s, i) => {
          const x = pad.l + i * bw + bw * 0.16;
          const w = bw * 0.68;
          const inRange = s.range.end >= rangeStart && s.range.start <= rangeEnd;
          let acc = 0;
          return (
            <g
              key={s.index}
              role="button"
              tabIndex={0}
              aria-label={`${s.label} 주 ${s.total}건`}
              aria-pressed={picked === i}
              onClick={() => setPicked(i)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setPicked(i)}
              className="cursor-pointer outline-none"
            >
              <rect x={pad.l + i * bw} y={pad.t - 14} width={bw} height={H - pad.t - pad.b + 14} fill={picked === i ? "#fff9c4" : "transparent"} rx={8} />
              {stack === "total" ? (
                <rect x={x} y={y(s.total)} width={w} height={y(0) - y(s.total)} rx={5} fill={inRange ? "#1a2030" : "#c9ced6"} />
              ) : (
                types.map((t) => {
                  const v = s.byType[t.id];
                  if (!v) return null;
                  const top = y(acc + v);
                  const h = y(acc) - top;
                  acc += v;
                  return <rect key={t.id} x={x} y={top} width={w} height={h} fill={TYPE_COLORS[t.id]} opacity={inRange ? 1 : 0.45} stroke="#fff" strokeWidth={0.8} />;
                })
              )}
              <text x={x + w / 2} y={y(s.total) - 5} textAnchor="middle" fontSize="10" fontWeight={picked === i ? 800 : 600} fill={picked === i ? "#191919" : "#6b7280"} className="num">
                {s.total}
              </text>
              <text x={x + w / 2} y={H - 10} textAnchor="middle" fontSize="10" fill="#6b7280" className="num">
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>

      {stack === "type" && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
          {EVENT_TYPES.map((t) => (
            <li key={t.id} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-sub">
              <span className="size-2.5 rounded-sm border border-ink/10" style={{ background: TYPE_COLORS[t.id as EventTypeId] }} aria-hidden="true" />
              {t.label}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 rounded-[18px] bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="num text-[14px] font-extrabold">
            {cur.range.start.slice(5).replace("-", ".")} ~ {cur.range.end.slice(5).replace("-", ".")}
          </p>
          <p className="num text-[20px] font-extrabold">
            {cur.total}
            <span className="ml-0.5 text-[13px] font-bold">건</span>
          </p>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[12px] text-ink-muted">직전 주 대비</span>
          <Delta pct={picked > 0 ? pctChange(cur.total, series[picked - 1].total) : null} />
        </div>
        <button
          type="button"
          onClick={() => {
            setScope({ period: "custom", from: cur.range.start, to: cur.range.end });
            showToast("선택한 주로 기간을 바꿨어요");
          }}
          className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-white text-[13px] font-bold shadow-sm active:bg-line"
        >
          <Eye className="size-4" aria-hidden="true" />이 주만 보기
        </button>
      </div>
    </div>
  );
}

function Heatmap({ events }: { events: IssueEvent[] }) {
  const matrix = useMemo(() => hourMatrix(events), [events]);
  const max = Math.max(0, ...matrix.flat());
  const [cell, setCell] = useState<{ d: number; h: number } | null>(null);
  const hours = Array.from({ length: HOUR_MAX - HOUR_MIN + 1 }, (_, i) => HOUR_MIN + i);
  const win = topWindow(matrix, 3);
  const dayTotals = matrix.map((row) => row.reduce((a, b) => a + b, 0));
  const topDay = dayTotals.indexOf(Math.max(...dayTotals));

  return (
    <div className="rounded-panel bg-white shadow-card p-5">
      <div role="grid" aria-label="요일·시간대별 이벤트 수" className="flex flex-col gap-[3px]">
        <div role="row" className="grid items-end gap-[3px]" style={{ gridTemplateColumns: `22px repeat(${hours.length}, minmax(0, 1fr))` }}>
          <span />
          {hours.map((h) => (
            <span key={h} role="columnheader" className="num text-center text-[10px] text-ink-muted">
              {h % 2 === 0 ? h : ""}
            </span>
          ))}
        </div>
        {matrix.map((row, d) => (
          <div key={d} role="row" className="grid items-center gap-[3px]" style={{ gridTemplateColumns: `22px repeat(${hours.length}, minmax(0, 1fr))` }}>
            <span role="rowheader" className="text-[11px] font-bold text-ink-sub">
              {weekdayLabel(d)}
            </span>
            {hours.map((h) => {
              const v = row[h];
              const on = cell?.d === d && cell.h === h;
              return (
                <button
                  key={h}
                  type="button"
                  role="gridcell"
                  aria-label={`${weekdayLabel(d)}요일 ${h}시 ${v}건`}
                  onClick={() => setCell(on ? null : { d, h })}
                  className={`aspect-square rounded-[5px] transition-transform ${on ? "scale-110 ring-2 ring-ink" : ""}`}
                  style={{ background: heatColor(v, max) }}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-ink-muted">
        <span>적음</span>
        <span className="flex gap-0.5" aria-hidden="true">
          {HEAT.map((c) => (
            <span key={c} className="h-2.5 w-6 first:rounded-l-full last:rounded-r-full" style={{ background: c }} />
          ))}
        </span>
        <span>많음</span>
      </div>

      {cell ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[18px] bg-kakao-soft p-4">
          <div>
            <p className="text-[14px] font-extrabold">
              {weekdayLabel(cell.d)}요일 {cell.h}시
            </p>
            <p className="num text-[13px] text-ink-sub">{matrix[cell.d][cell.h]}건</p>
          </div>
          <button
            type="button"
            disabled={matrix[cell.d][cell.h] === 0}
            onClick={() => navigate(eventsHref({ wd: cell.d, hr: [cell.h, cell.h] }))}
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-ink pr-3 pl-4 text-[13px] font-bold text-white disabled:opacity-40"
          >
            이벤트 보기
            <ArrowRight className="size-3.5 text-kakao" strokeWidth={2.8} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <p className="mt-4 rounded-[18px] bg-surface p-4 text-[13px] leading-relaxed text-ink-sub">
          {events.length === 0 ? "이벤트가 없어요" : (
            <>
              가장 많은 시간 <b className="num">{win.from}–{win.from + 3}시</b> ({Math.round(win.share * 100)}%) · 가장 많은 요일 <b>{weekdayLabel(topDay)}요일</b>
            </>
          )}
        </p>
      )}
    </div>
  );
}

type Tab = "recs" | "trend" | "cause" | "quality";

const TABS: { id: Tab; label: string }[] = [
  { id: "recs", label: "패턴" },
  { id: "trend", label: "추이·시간" },
  { id: "cause", label: "원인·구간" },
  { id: "quality", label: "기록 품질" },
];

const ALIAS: Record<string, Tab> = { recs: "recs", trend: "trend", time: "trend", cause: "cause", patterns: "cause", quality: "quality", vehicle: "quality" };

export default function Analysis({ route }: { route: HashRoute }) {
  const { range, events, baseline, scopedAll } = useScopeData();
  const { dismissedRecs } = prefsStore.use();
  const [showHidden, setShowHidden] = useState(false);
  const tab = ALIAS[route.params.get("s") ?? ""] ?? "recs";

  const summary = useMemo(() => summarize(events, baseline, range), [events, baseline, range]);
  const allRecs = useMemo(() => buildRecommendations({ events, scopedAll, range }), [events, scopedAll, range]);
  const recs = allRecs.filter((r) => !dismissedRecs.includes(r.id));
  const hidden = allRecs.filter((r) => dismissedRecs.includes(r.id));

  const total = events.length;
  const byArea = (cause: string) => AREAS.map((a) => events.filter((e) => e.cause === cause && ZONE_BY_ID[e.zoneId].area === a.id).length);
  const weather = ["맑음", "흐림", "비", ""].map((w) => ({ label: w || "미기록", n: events.filter((e) => e.weather === w).length }));
  const rainRatio = total ? weather[2].n / total / 0.12 : 0;
  const maxCause = Math.max(1, ...CAUSES.map((c) => events.filter((e) => e.cause === c.id).length));
  const maxType = Math.max(1, ...summary.byType.map((t) => t.count));
  const fields = events.flatMap((e) => e.fields);
  const autoRate = fields.length ? Math.round((fields.filter((f) => f.value).length / fields.length) * 100) : 0;
  const avgStt = total ? Math.round((events.reduce((a, e) => a + e.sttConfidence, 0) / total) * 100) : 0;
  const edited = fields.filter((f) => f.edited).length;

  const setTab = (t: Tab) => navigate(`/admin/analysis?s=${t}`, true);

  return (
    <>
      <ScopeBar />
      <PageHeader title="분석" />

      <div className="flex flex-col gap-6 px-5 pt-4 pb-12">
        <Segmented label="분석 종류" value={tab} onChange={setTab} options={TABS} />

        {tab === "recs" && (
          <Block id="recs" title="반복 패턴">
            {recs.length === 0 ? (
              <div className="flex items-center gap-3 rounded-[22px] bg-surface p-4 text-[14px] text-ink-sub">
                <Lightbulb className="size-5 shrink-0" aria-hidden="true" />
                {total === 0 ? "이 범위에는 이벤트가 없어요." : "조치할 항목이 없어요"}
              </div>
            ) : (
              recs.map((r) => <RecCard key={r.id} rec={r} detailed />)
            )}
            {hidden.length > 0 && (
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => setShowHidden((v) => !v)} className="h-11 self-start rounded-full px-3 text-[13px] font-bold text-ink-sub active:bg-surface">
                  숨긴 패턴 {hidden.length}건 {showHidden ? "접기" : "보기"}
                </button>
                {showHidden &&
                  hidden.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 rounded-[18px] bg-surface px-4 py-3">
                      <span className="min-w-0 truncate text-[14px] font-semibold text-ink-sub">{r.title}</span>
                      <button type="button" onClick={() => restoreRec(r.id)} className="h-10 shrink-0 rounded-full bg-white px-3.5 text-[13px] font-bold shadow-sm">
                        다시 보기
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </Block>
        )}

        {tab === "trend" && (
          <>
            <Block id="trend" title="주간 추이">
              <TrendChart events={scopedAll} rangeStart={range.start} rangeEnd={range.end} />
            </Block>
            <Block id="time" title="요일·시간대">
              <Heatmap events={events} />
            </Block>
          </>
        )}

        {tab === "cause" && (
          <>
            <Block id="patterns" title="반복 구간">
              {summary.patterns.length === 0 ? (
                <p className="rounded-[22px] bg-surface p-4 text-[14px] text-ink-sub">반복된 패턴이 없어요</p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {summary.patterns.map((p) => {
                    const diff = p.prevCount === null ? null : p.count - p.prevCount;
                    return (
                      <li key={`${p.zoneId}-${p.cause}`}>
                        <div className="flex items-center gap-3 rounded-[22px] bg-white shadow-card p-4">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[16px] font-bold">{ZONE_BY_ID[p.zoneId].name}</p>
                            <p className="mt-0.5 text-[13px] text-ink-muted">{CAUSE_BY_ID[p.cause].label}</p>
                            <div className="mt-2 flex gap-1.5">
                              <a href={`#${eventsHref({ zone: [p.zoneId], cause: [p.cause] })}`} className="inline-flex h-10 items-center rounded-full bg-surface px-4 text-[13px] font-bold active:bg-line">
                                이벤트
                              </a>
                              <a href={`#/admin/map?zone=${p.zoneId}`} className="inline-flex h-10 items-center rounded-full bg-surface px-4 text-[13px] font-bold active:bg-line">
                                지도
                              </a>
                            </div>
                          </div>
                          <Sparkline values={zoneCauseSeries(scopedAll, p.zoneId, p.cause)} label="최근 8주 추이" fill="rgba(254,229,0,0.35)" width={84} height={36} />
                          <div className="w-[52px] text-right">
                            <p className="num text-[22px] leading-none font-extrabold">
                              {p.count}
                              <span className="ml-0.5 text-[13px] font-bold">회</span>
                            </p>
                            <p className={`num mt-1 text-[12px] font-bold ${diff === null || diff === 0 ? "text-ink-muted" : diff > 0 ? "text-danger" : "text-ok"}`}>
                              {diff === null ? "—" : diff === 0 ? "동일" : `${diff > 0 ? "+" : ""}${diff}`}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Block>

            <Block id="cause" title="원인별">
              <div className="rounded-panel bg-white shadow-card p-5">
                <div className="mb-3 flex items-center gap-3 text-[12px] font-semibold text-ink-sub">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-kakao" aria-hidden="true" />
                    {AREAS[0].label}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-navy" aria-hidden="true" />
                    {AREAS[1].label}
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {CAUSES.map((c) => {
                    const n = events.filter((e) => e.cause === c.id).length;
                    const [gn, sb] = byArea(c.id);
                    const prev = baseline ? baseline.filter((e) => e.cause === c.id).length : null;
                    return (
                      <li key={c.id}>
                        <a href={`#${eventsHref({ cause: [c.id] })}`} className="flex flex-col gap-1.5 rounded-[16px] px-2 py-2.5 active:bg-surface">
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-[14px] font-bold">{c.label}</span>
                            <span className="flex items-center gap-2">
                              <Delta pct={pctChange(n, prev)} />
                              <span className="num w-8 text-right text-[15px] font-extrabold">{n}</span>
                            </span>
                          </span>
                          <span className="flex h-2.5 overflow-hidden rounded-full bg-surface" style={{ width: `${Math.max(4, (n / maxCause) * 100)}%` }}>
                            <span className="bg-kakao" style={{ width: `${n ? (gn / n) * 100 : 0}%` }} />
                            <span className="bg-navy" style={{ width: `${n ? (sb / n) * 100 : 0}%` }} />
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Block>

            <Block id="type" title="유형별">
              <ul className="flex flex-col rounded-panel bg-white shadow-card p-2">
                {summary.byType.map((t) => (
                  <li key={t.id}>
                    <a href={`#${eventsHref({ type: [t.id] })}`} className="flex items-center gap-3 rounded-[18px] px-3 py-3 active:bg-surface">
                      <span className="w-[72px] shrink-0 text-[14px] font-bold text-ink-sub">{t.label}</span>
                      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
                        <span className="block h-full rounded-full" style={{ width: `${(t.count / maxType) * 100}%`, background: TYPE_COLORS[t.id as EventTypeId] }} />
                      </span>
                      <span className="num w-9 shrink-0 text-right text-[16px] font-extrabold">{t.count}</span>
                      <span className="w-[62px] shrink-0 text-right">
                        <Delta pct={pctChange(t.count, t.prev)} className="justify-end" />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </Block>

            <Block id="severity" title="심각도·날씨">
              <div className="rounded-panel bg-white shadow-card p-5">
                <h3 className="text-[15px] font-extrabold">심각도</h3>
                <div className="mt-3 flex h-4 overflow-hidden rounded-full bg-surface" role="img" aria-label={`높음 ${summary.bySeverity.high}건, 주의 ${summary.bySeverity.mid}건, 낮음 ${summary.bySeverity.low}건`}>
                  <span className="bg-danger" style={{ width: `${total ? (summary.bySeverity.high / total) * 100 : 0}%` }} />
                  <span className="bg-warning" style={{ width: `${total ? (summary.bySeverity.mid / total) * 100 : 0}%` }} />
                  <span className="bg-ink-muted/40" style={{ width: `${total ? (summary.bySeverity.low / total) * 100 : 0}%` }} />
                </div>
                <ul className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {(
                    [
                      ["high", "사고", "bg-danger"],
                      ["mid", "주의", "bg-warning"],
                      ["low", "낮음", "bg-ink-muted/40"],
                    ] as const
                  ).map(([k, label, color]) => (
                    <li key={k}>
                      <a href={`#${eventsHref({ sev: [k] })}`} className="flex flex-col items-center gap-1 rounded-[16px] bg-surface py-3 active:bg-line">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-sub">
                          <span className={`size-2.5 rounded-full ${color}`} aria-hidden="true" />
                          {label}
                        </span>
                        <span className="num text-[20px] font-extrabold">{summary.bySeverity[k]}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-panel bg-white shadow-card p-5">
                <h3 className="text-[15px] font-extrabold">날씨</h3>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {weather.map((w) => (
                    <li key={w.label}>
                      <a href={`#${eventsHref({ wx: [w.label] })}`} className="flex items-center gap-3 active:opacity-70">
                        <span className="w-12 shrink-0 text-[14px] font-semibold text-ink-sub">{w.label}</span>
                        <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
                          <span className={`block h-full rounded-full ${w.label === "비" ? "bg-navy" : "bg-kakao"}`} style={{ width: `${total ? (w.n / total) * 100 : 0}%` }} />
                        </span>
                        <span className="num w-[72px] shrink-0 text-right text-[14px] font-extrabold">
                          {w.n}건 <span className="text-[11px] font-semibold text-ink-muted">{total ? Math.round((w.n / total) * 100) : 0}%</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
                {rainRatio >= 1.2 && (
                  <p className="mt-3 rounded-[14px] bg-kakao-soft p-3 text-[13px] leading-relaxed">
                    비 오는 날 비중이 평소(12%)의 <b className="num">{rainRatio.toFixed(1)}배</b>예요
                  </p>
                )}
              </div>
            </Block>
          </>
        )}

        {tab === "quality" && (
          <>
            <Block id="quality" title="자동 정리 품질">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { v: `${autoRate}%`, l: "항목 자동 채움" },
                  { v: `${avgStt}%`, l: "음성 인식 신뢰도" },
                  { v: String(edited), l: "직접 수정 항목" },
                ].map((c) => (
                  <div key={c.l} className="rounded-[20px] bg-surface px-2 py-4">
                    <ScanText className="mx-auto mb-1.5 size-4 text-ink-muted" aria-hidden="true" />
                    <p className="num text-[22px] leading-none font-extrabold">{c.v}</p>
                    <p className="mt-1.5 text-[12px] font-semibold text-ink-muted">{c.l}</p>
                  </div>
                ))}
              </div>
            </Block>
          </>
        )}

      </div>
    </>
  );
}
