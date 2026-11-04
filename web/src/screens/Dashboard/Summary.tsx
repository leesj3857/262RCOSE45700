import { useMemo, useState } from "react";
import { ArrowRight, CircleCheck, Ellipsis, Inbox, Mic, Repeat, ScanText, Sparkles } from "lucide-react";
import { CAUSE_BY_ID, pctChange, summarize, zoneCauseSeries } from "@/lib/analytics";
import { buildRecommendations } from "@/lib/recommendations";
import { eventsHref } from "@/lib/filters";
import { baselineName, periodLabel } from "@/lib/scope";
import { ZONE_BY_ID } from "@/lib/zones";
import { navigate } from "@/lib/useHashRoute";
import { rangeText } from "@/lib/dates";
import { prefsStore } from "@/state/userData";
import { useScopeData } from "@/state/useScopeData";
import Delta from "./parts/Delta";
import EmptyState from "./parts/EmptyState";
import MoreSheet from "./parts/MoreSheet";
import PageHeader from "./parts/PageHeader";
import RecCard from "./parts/RecCard";
import ScopeBar from "./parts/ScopeBar";
import Sparkline from "./parts/Sparkline";

function SectionHead({ title, note, href, linkLabel }: { title: string; note?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-end justify-between gap-3 px-1">
      <div>
        <h2 className="text-[18px] font-extrabold tracking-tight">{title}</h2>
        {note && <p className="mt-0.5 text-[12px] text-ink-muted">{note}</p>}
      </div>
      {href && (
        <a href={`#${href}`} className="inline-flex h-9 shrink-0 items-center gap-0.5 text-[13px] font-bold text-ink-sub">
          {linkLabel ?? "전체 보기"}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

export default function Summary() {
  const data = useScopeData();
  const { scope, range, events, baseline, scopedAll } = data;
  const [more, setMore] = useState(false);
  const { dismissedRecs } = prefsStore.use();

  const summary = useMemo(() => summarize(events, baseline, range), [events, baseline, range]);
  const recs = useMemo(
    () => buildRecommendations({ events, scopedAll, range }).filter((r) => !dismissedRecs.includes(r.id)),
    [events, scopedAll, range, dismissedRecs],
  );

  const compareName = baselineName(scope);
  const maxBucket = Math.max(1, ...summary.buckets.map((b) => b.count));
  const peak = Math.max(...summary.buckets.map((b) => b.count));
  const reviewed = summary.byStatus.reviewed;
  const total = summary.total;
  const fields = events.flatMap((e) => e.fields);
  const filled = fields.filter((f) => f.value).length;
  const autoRate = fields.length ? Math.round((filled / fields.length) * 100) : 0;
  const avgStt = events.length ? Math.round((events.reduce((a, e) => a + e.sttConfidence, 0) / events.length) * 100) : 0;
  const edited = fields.filter((f) => f.edited).length;
  const highBefore = baseline ? baseline.filter((e) => e.severity === "high").length : null;
  const maxType = Math.max(1, ...summary.byType.map((t) => t.count));

  return (
    <>
      <PageHeader
        eyebrow="Kakao Mobility · 주행 이슈"
        title="분석 요약"
        right={
          <div className="flex items-center gap-2">
            <a
              href="#/"
              aria-label="녹음 화면으로"
              className="flex h-11 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[13px] font-bold text-ink-sub active:bg-line"
            >
              <Mic className="size-4" aria-hidden="true" />
              녹음
            </a>
            <button
              type="button"
              onClick={() => setMore(true)}
              aria-label="더보기"
              className="flex size-11 items-center justify-center rounded-full bg-surface active:bg-line"
            >
              <Ellipsis className="size-5" aria-hidden="true" />
            </button>
          </div>
        }
      />
      <ScopeBar />
      <MoreSheet open={more} onClose={() => setMore(false)} />

      <div className="flex flex-col gap-7 px-5 pt-5 pb-10">
        {total === 0 ? (
          <EmptyState
            icon={<Inbox className="size-6" aria-hidden="true" />}
            title="이 범위에는 기록이 없어요"
            description="기간을 늘리거나 지역·차량 조건을 바꿔 보세요."
          />
        ) : (
          <>
            <section aria-label="기간 요약" className="overflow-hidden rounded-panel bg-navy p-6 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-white/75">{periodLabel(scope)} 이벤트 기록</p>
                  <p className="num mt-0.5 text-[12px] text-white/50">{rangeText(range)}</p>
                </div>
                {summary.deltaPct !== null && compareName ? (
                  <span className="num inline-flex h-8 items-center gap-1 rounded-full bg-white/10 px-3 text-[13px] font-bold">
                    <span className="text-white/70">{compareName} 대비</span>
                    <span className={summary.deltaPct <= 0 ? "text-kakao" : "text-[#ff8a80]"}>
                      {summary.deltaPct > 0 ? "+" : ""}
                      {summary.deltaPct}%
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex h-8 items-center rounded-full bg-white/10 px-3 text-[12px] font-semibold text-white/60">비교 기준 없음</span>
                )}
              </div>

              <p className="num mt-5 text-[68px] leading-none font-extrabold text-kakao">
                {total}
                <span className="ml-1 text-[28px] font-bold text-white">건</span>
              </p>

              <ul className="mt-6 flex h-[124px] items-end gap-1.5" aria-label="기간별 이벤트 수">
                {summary.buckets.map((b) => {
                  const top = b.count === peak;
                  return (
                    <li key={b.key} className="h-full min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => navigate(eventsHref({ df: b.start, dt: b.end }))}
                      aria-label={`${b.sub} ${b.count}건, 눌러서 목록 보기`}
                      className="group flex h-full w-full flex-col items-center justify-end gap-1.5"
                    >
                      <span className={`num text-[12px] font-bold ${top ? "text-kakao" : "text-white/60"}`}>{b.count}</span>
                      <span
                        className={`w-full rounded-[8px] transition-opacity group-active:opacity-70 ${top ? "bg-kakao" : "bg-white/20"}`}
                        style={{ height: `${Math.max(6, (b.count / maxBucket) * 64)}px` }}
                      />
                      <span className="text-[12px] font-medium text-white/60">{b.label}</span>
                    </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-center text-[11px] text-white/45">막대를 누르면 그 기간의 이벤트를 볼 수 있어요</p>
            </section>

            <section aria-label="핵심 지표" className="grid grid-cols-2 gap-3">
              <a href={`#${eventsHref({ sev: ["high"], sort: "severity" })}`} className="flex flex-col gap-2 rounded-[22px] border border-line bg-white p-4 active:bg-surface">
                <span className="text-[13px] font-bold text-ink-sub">접촉·충돌 사고</span>
                <span className="num text-[32px] leading-none font-extrabold">
                  {summary.bySeverity.high}
                  <span className="ml-0.5 text-[15px] font-bold">건</span>
                </span>
                <Delta pct={pctChange(summary.bySeverity.high, highBefore)} />
              </a>
              <a href={`#${eventsHref({ st: ["new"], sort: "oldest" })}`} className="flex flex-col gap-2 rounded-[22px] border border-line bg-white p-4 active:bg-surface">
                <span className="text-[13px] font-bold text-ink-sub">미검토</span>
                <span className="num text-[32px] leading-none font-extrabold">
                  {summary.byStatus.new}
                  <span className="ml-0.5 text-[15px] font-bold">건</span>
                </span>
                <span className="num text-[12px] font-semibold text-ink-muted">전체의 {Math.round((summary.byStatus.new / total) * 100)}%</span>
              </a>
              <a href={`#${eventsHref({ check: true, sort: "check" })}`} className="flex flex-col gap-2 rounded-[22px] border border-line bg-white p-4 active:bg-surface">
                <span className="text-[13px] font-bold text-ink-sub">확인 필요</span>
                <span className="num text-[32px] leading-none font-extrabold">
                  {summary.checkCount}
                  <span className="ml-0.5 text-[15px] font-bold">건</span>
                </span>
                <span className="text-[12px] font-semibold text-ink-muted">비어 있는 항목 있음</span>
              </a>
              <a href="#/admin/analysis?s=patterns" className="flex flex-col gap-2 rounded-[22px] border border-line bg-white p-4 active:bg-surface">
                <span className="text-[13px] font-bold text-ink-sub">반복 구간</span>
                <span className="num text-[32px] leading-none font-extrabold">
                  {summary.patterns.length}
                  <span className="ml-0.5 text-[15px] font-bold">곳</span>
                </span>
                <span className="text-[12px] font-semibold text-ink-muted">같은 장소·원인 반복</span>
              </a>
            </section>

            <section aria-label="추천 조치" className="flex flex-col gap-3">
              <SectionHead
                title="추천 조치"
                note={recs.length > 0 ? "데이터에서 찾은 개선 포인트예요" : undefined}
                href={recs.length > 2 ? "/admin/analysis?s=recs" : undefined}
                linkLabel={`모두 보기 ${recs.length}`}
              />
              {recs.length === 0 ? (
                <div className="flex items-center gap-3 rounded-[22px] bg-surface p-4 text-[14px] text-ink-sub">
                  <Sparkles className="size-5 shrink-0" aria-hidden="true" />이 범위에서는 지금 바로 조치할 항목이 없어요.
                </div>
              ) : (
                recs.slice(0, 2).map((r) => <RecCard key={r.id} rec={r} />)
              )}
            </section>

            <section aria-label="검토 현황" className="flex flex-col gap-3 rounded-panel border border-line bg-white p-5">
              <div className="flex items-end justify-between">
                <h2 className="text-[18px] font-extrabold tracking-tight">검토 현황</h2>
                <span className="num text-[13px] font-bold text-ink-sub">
                  {reviewed}/{total}건 완료
                </span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-surface" role="img" aria-label={`검토 완료 ${reviewed}건, 조치 필요 ${summary.byStatus.flagged}건, 미검토 ${summary.byStatus.new}건`}>
                <span className="bg-ok" style={{ width: `${(reviewed / total) * 100}%` }} />
                <span className="bg-warning" style={{ width: `${(summary.byStatus.flagged / total) * 100}%` }} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] font-semibold text-ink-sub">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-ok" />
                  검토 완료 <span className="num">{reviewed}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-warning" />
                  조치 필요 <span className="num">{summary.byStatus.flagged}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-line" />
                  미검토 <span className="num">{summary.byStatus.new}</span>
                </span>
              </div>
              {summary.byStatus.new > 0 ? (
                <a
                  href={`#${eventsHref({ st: ["new"], sort: "oldest" })}`}
                  className="mt-1 flex h-12 items-center justify-center gap-2 rounded-full bg-kakao text-[15px] font-extrabold active:bg-kakao-press"
                >
                  미검토 이벤트 검토하기
                  <ArrowRight className="size-4" strokeWidth={2.6} aria-hidden="true" />
                </a>
              ) : (
                <p className="mt-1 flex items-center justify-center gap-2 rounded-full bg-[#e6f6ed] py-3 text-[14px] font-bold text-[#0f7a42]">
                  <CircleCheck className="size-4" aria-hidden="true" />
                  모든 이벤트를 검토했어요
                </p>
              )}
            </section>

            <section aria-label="유형별 집계" className="flex flex-col gap-3">
              <SectionHead title="유형별 집계" note={compareName ? `${compareName} 대비 변화를 함께 보여줘요` : undefined} href="/admin/events" />
              <ul className="flex flex-col rounded-panel border border-line bg-white p-2">
                {summary.byType.map((t) => (
                  <li key={t.id}>
                    <a href={`#${eventsHref({ type: [t.id] })}`} className="flex items-center gap-3 rounded-[18px] px-3 py-3 active:bg-surface">
                      <span className="w-[72px] shrink-0 text-[14px] font-bold text-ink-sub">{t.label}</span>
                      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
                        <span className="block h-full rounded-full bg-kakao" style={{ width: `${(t.count / maxType) * 100}%` }} />
                      </span>
                      <span className="num w-10 shrink-0 text-right text-[16px] font-extrabold">{t.count}</span>
                      <span className="w-[62px] shrink-0 text-right">
                        <Delta pct={pctChange(t.count, t.prev)} className="justify-end" />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="최다 원인" className="flex flex-col gap-3">
              <SectionHead title="최다 원인" href="/admin/analysis?s=cause" linkLabel="원인 분석" />
              <div className="grid grid-cols-1 gap-2.5">
                {summary.byCause.slice(0, 3).map((c, i) => (
                  <a
                    key={c.id}
                    href={`#${eventsHref({ cause: [c.id] })}`}
                    className={`flex items-center gap-4 rounded-[22px] p-4 transition-transform active:scale-[0.99] ${i === 0 ? "bg-kakao" : "bg-surface"}`}
                  >
                    <span className="num flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-[16px] font-extrabold text-white">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] font-bold">{c.label}</span>
                      <span className="mt-0.5 flex items-center gap-2 text-[13px] font-medium text-ink/65">
                        전체의 {Math.round(c.share * 100)}%
                        <Delta pct={pctChange(c.count, c.prev)} />
                      </span>
                    </span>
                    <span className="num text-[26px] font-extrabold">
                      {c.count}
                      <span className="ml-0.5 text-[15px] font-bold">건</span>
                    </span>
                  </a>
                ))}
              </div>
            </section>

            <section aria-label="반복 패턴" className="flex flex-col gap-3">
              <div className="flex items-end justify-between gap-3 px-1">
                <div>
                  <h2 className="flex items-center gap-2 text-[18px] font-extrabold tracking-tight">
                    <Repeat className="size-4" strokeWidth={2.6} aria-hidden="true" />
                    반복 패턴
                  </h2>
                  <p className="mt-0.5 text-[12px] text-ink-muted">같은 장소 · 같은 원인으로 자주 발생한 구간 · 최근 8주 추이</p>
                </div>
              </div>
              {summary.patterns.length === 0 ? (
                <p className="rounded-[22px] bg-surface p-4 text-[14px] text-ink-sub">이 범위에서는 반복된 패턴이 없어요.</p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {summary.patterns.map((p) => {
                    const diff = p.prevCount === null ? null : p.count - p.prevCount;
                    return (
                      <li key={`${p.zoneId}-${p.cause}`}>
                        <a
                          href={`#${eventsHref({ zone: [p.zoneId], cause: [p.cause] })}`}
                          className="flex items-center gap-3 rounded-[22px] border border-line bg-white p-4 transition-colors active:bg-surface"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[16px] font-bold">{ZONE_BY_ID[p.zoneId].name}</span>
                            <span className="mt-0.5 block text-[13px] text-ink-muted">{CAUSE_BY_ID[p.cause].label}</span>
                          </span>
                          <Sparkline values={zoneCauseSeries(scopedAll, p.zoneId, p.cause)} label="최근 8주 추이" fill="rgba(254,229,0,0.35)" />
                          <span className="w-[58px] text-right">
                            <span className="num block text-[22px] leading-none font-extrabold">
                              {p.count}
                              <span className="ml-0.5 text-[13px] font-bold">회</span>
                            </span>
                            <span className={`num mt-1 block text-[12px] font-bold ${diff === null || diff === 0 ? "text-ink-muted" : diff > 0 ? "text-danger" : "text-ok"}`}>
                              {diff === null ? "—" : diff === 0 ? "동일" : `${diff > 0 ? "+" : ""}${diff}`}
                            </span>
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section aria-label="자동 정리 품질" className="flex flex-col gap-4 rounded-panel bg-surface p-5">
              <div className="flex items-center gap-2">
                <ScanText className="size-5" aria-hidden="true" />
                <h2 className="text-[18px] font-extrabold tracking-tight">자동 정리 품질</h2>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-[18px] bg-white px-2 py-3">
                  <p className="num text-[24px] leading-none font-extrabold">{autoRate}%</p>
                  <p className="mt-1.5 text-[12px] font-semibold text-ink-muted">항목 자동 채움</p>
                </div>
                <div className="rounded-[18px] bg-white px-2 py-3">
                  <p className="num text-[24px] leading-none font-extrabold">{avgStt}%</p>
                  <p className="mt-1.5 text-[12px] font-semibold text-ink-muted">음성 인식 신뢰도</p>
                </div>
                <div className="rounded-[18px] bg-white px-2 py-3">
                  <p className="num text-[24px] leading-none font-extrabold">{edited}</p>
                  <p className="mt-1.5 text-[12px] font-semibold text-ink-muted">직접 수정 항목</p>
                </div>
              </div>
              <p className="text-[12px] leading-relaxed text-ink-muted">근거 발화가 없는 항목은 지어내지 않고 비워 두기 때문에 자동 채움 비율이 100%가 되지 않아요.</p>
            </section>
          </>
        )}
      </div>
    </>
  );
}
