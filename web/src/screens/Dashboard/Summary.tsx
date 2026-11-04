import { useMemo, useState } from "react";
import { ArrowRight, ChevronRight, CircleCheck, Ellipsis, Inbox, Mic, Sparkles } from "lucide-react";
import { CAUSE_BY_ID, summarize, zoneCounts } from "@/lib/analytics";
import { buildRecommendations } from "@/lib/recommendations";
import { eventsHref } from "@/lib/filters";
import { baselineName, periodLabel } from "@/lib/scope";
import { ZONE_BY_ID } from "@/lib/zones";
import { navigate } from "@/lib/useHashRoute";
import { prefsStore } from "@/state/userData";
import { useScopeData } from "@/state/useScopeData";
import EmptyState from "./parts/EmptyState";
import MoreSheet from "./parts/MoreSheet";
import PageHeader from "./parts/PageHeader";
import RecCard from "./parts/RecCard";
import ScopeBar from "./parts/ScopeBar";

type Todo = { key: string; count: number; title: string; hint: string; href: string; tone: "danger" | "ink" };

export default function Summary() {
  const { scope, range, events, baseline, scopedAll } = useScopeData();
  const [more, setMore] = useState(false);
  const { dismissedRecs } = prefsStore.use();

  const summary = useMemo(() => summarize(events, baseline, range), [events, baseline, range]);
  const recs = useMemo(
    () => buildRecommendations({ events, scopedAll, range }).filter((r) => !dismissedRecs.includes(r.id)),
    [events, scopedAll, range, dismissedRecs],
  );

  const total = summary.total;
  const compareName = baselineName(scope);
  const maxBucket = Math.max(1, ...summary.buckets.map((b) => b.count));
  const peak = Math.max(...summary.buckets.map((b) => b.count));
  const reviewed = summary.byStatus.reviewed;
  const severePending = events.filter((e) => e.severity === "high" && e.status !== "reviewed").length;

  const todos: Todo[] = [
    {
      key: "severe",
      count: severePending,
      title: `사고 ${severePending}건 확인하기`,
      hint: "접촉·충돌 이벤트가 아직 검토되지 않았어요",
      href: eventsHref({ sev: ["high"], st: ["new", "flagged"], sort: "severity" }),
      tone: "danger" as const,
    },
    {
      key: "new",
      count: summary.byStatus.new,
      title: `미검토 ${summary.byStatus.new}건 검토하기`,
      hint: "오래된 기록부터 하나씩 열어 확인해요",
      href: eventsHref({ st: ["new"], sort: "oldest" }),
      tone: "ink" as const,
    },
    {
      key: "check",
      count: summary.checkCount,
      title: `비어 있는 항목 ${summary.checkCount}건 채우기`,
      hint: "근거 발화가 없어 비워 둔 항목이에요",
      href: eventsHref({ check: true, sort: "check" }),
      tone: "ink" as const,
    },
  ].filter((t) => t.count > 0);

  const topType = summary.byType[0];
  const topCause = summary.byCause[0];
  const topZone = [...zoneCounts(events).entries()].sort((a, b) => b[1].length - a[1].length)[0];

  return (
    <>
      <PageHeader
        title="요약"
        sub="한 주의 상황과 지금 할 일을 보여줘요"
        right={
          <div className="flex items-center gap-2">
            <a href="#/" aria-label="녹음 화면으로" className="flex h-11 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[13px] font-bold text-ink-sub active:bg-line">
              <Mic className="size-4" aria-hidden="true" />
              녹음
            </a>
            <button type="button" onClick={() => setMore(true)} aria-label="더보기와 도움말" className="flex size-11 items-center justify-center rounded-full bg-surface active:bg-line">
              <Ellipsis className="size-5" aria-hidden="true" />
            </button>
          </div>
        }
      />
      <ScopeBar />
      <MoreSheet open={more} onClose={() => setMore(false)} />

      <div className="flex flex-col gap-7 px-5 pt-5 pb-10">
        {total === 0 ? (
          <EmptyState icon={<Inbox className="size-6" aria-hidden="true" />} title="이 범위에는 기록이 없어요" description="위에서 기간을 늘리거나 다른 차량을 골라 보세요." />
        ) : (
          <>
            <section aria-label="기간 요약" className="overflow-hidden rounded-panel bg-navy p-6 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-white/80">{periodLabel(scope)} 이벤트 기록</p>
                </div>
                {summary.deltaPct !== null && compareName ? (
                  <span className="num inline-flex h-8 items-center gap-1 rounded-full bg-white/10 px-3 text-[13px] font-bold">
                    <span className="text-white/75">{compareName} 대비</span>
                    <span className={summary.deltaPct <= 0 ? "text-kakao" : "text-[#ff8a80]"}>
                      {summary.deltaPct > 0 ? "+" : ""}
                      {summary.deltaPct}%
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex h-8 items-center rounded-full bg-white/10 px-3 text-[12px] font-semibold text-white/70">비교 기준 없음</span>
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
                        <span className={`num text-[12px] font-bold ${top ? "text-kakao" : "text-white/70"}`}>{b.count}</span>
                        <span
                          className={`w-full rounded-[8px] transition-opacity group-active:opacity-70 ${top ? "bg-kakao" : "bg-white/20"}`}
                          style={{ height: `${Math.max(6, (b.count / maxBucket) * 64)}px` }}
                        />
                        <span className="text-[12px] font-medium text-white/70">{b.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-center text-[12px] text-white/60">막대를 누르면 그날(주)의 이벤트가 열려요</p>
            </section>

            <section aria-label="지금 할 일" className="flex flex-col gap-3">
              <div className="flex items-end justify-between px-1">
                <h2 className="text-[18px] font-extrabold tracking-tight">지금 할 일</h2>
                <span className="num text-[13px] font-bold text-ink-sub">
                  검토 {reviewed}/{total}건
                </span>
              </div>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-surface" role="img" aria-label={`전체 ${total}건 중 ${reviewed}건 검토 완료`}>
                <span className="bg-ok" style={{ width: `${(reviewed / total) * 100}%` }} />
                <span className="bg-warning" style={{ width: `${(summary.byStatus.flagged / total) * 100}%` }} />
              </div>
              {todos.length === 0 ? (
                <p className="flex items-center justify-center gap-2 rounded-[22px] bg-[#e6f6ed] py-4 text-[14px] font-bold text-[#0f7a42]">
                  <CircleCheck className="size-5" aria-hidden="true" />
                  지금 할 일을 모두 마쳤어요
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {todos.map((t) => (
                    <li key={t.key}>
                      <a
                        href={`#${t.href}`}
                        className={`flex items-center gap-4 rounded-[22px] border p-4 transition-colors active:bg-surface ${t.tone === "danger" ? "border-danger/30 bg-danger/5" : "border-line bg-white"}`}
                      >
                        <span className={`num flex size-11 shrink-0 items-center justify-center rounded-full text-[17px] font-extrabold ${t.tone === "danger" ? "bg-danger text-white" : "bg-ink text-white"}`}>{t.count}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[16px] font-extrabold">{t.title}</span>
                          <span className="mt-0.5 block text-[13px] text-ink-sub">{t.hint}</span>
                        </span>
                        <ChevronRight className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-label="추천 조치" className="flex flex-col gap-3">
              <div className="flex items-end justify-between gap-3 px-1">
                <h2 className="text-[18px] font-extrabold tracking-tight">추천 조치</h2>
                {recs.length > 1 && (
                  <a href="#/admin/analysis?s=recs" className="inline-flex h-10 items-center gap-0.5 text-[13px] font-bold text-ink-sub">
                    {recs.length}건 모두 보기
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>
              {recs.length === 0 ? (
                <div className="flex items-center gap-3 rounded-[22px] bg-surface p-4 text-[14px] text-ink-sub">
                  <Sparkles className="size-5 shrink-0" aria-hidden="true" />이 범위에서는 지금 바로 조치할 항목이 없어요.
                </div>
              ) : (
                <RecCard rec={recs.find((r) => r.kind === "hotspot") ?? recs[0]} />
              )}
            </section>

            <section aria-label="가장 많은 것" className="flex flex-col gap-3">
              <h2 className="px-1 text-[18px] font-extrabold tracking-tight">가장 많은 것</h2>
              <ul className="flex flex-col rounded-panel border border-line bg-white p-2">
                <li>
                  <a href={`#${eventsHref({ type: [topType.id] })}`} className="flex items-center gap-3 rounded-[20px] px-4 py-3.5 active:bg-surface">
                    <span className="w-[48px] shrink-0 text-[13px] font-bold text-ink-muted">유형</span>
                    <span className="min-w-0 flex-1 text-[16px] font-extrabold">{topType.label}</span>
                    <span className="num text-[15px] font-bold">{topType.count}건</span>
                    <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  </a>
                </li>
                <li>
                  <a href={`#${eventsHref({ cause: [topCause.id] })}`} className="flex items-center gap-3 rounded-[20px] px-4 py-3.5 active:bg-surface">
                    <span className="w-[48px] shrink-0 text-[13px] font-bold text-ink-muted">원인</span>
                    <span className="min-w-0 flex-1 text-[16px] font-extrabold">{topCause.label}</span>
                    <span className="num text-[15px] font-bold">{topCause.count}건</span>
                    <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  </a>
                </li>
                {topZone && (
                  <li>
                    <a href={`#/admin/map?zone=${topZone[0]}`} className="flex items-center gap-3 rounded-[20px] px-4 py-3.5 active:bg-surface">
                      <span className="w-[48px] shrink-0 text-[13px] font-bold text-ink-muted">장소</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[16px] font-extrabold">{ZONE_BY_ID[topZone[0]].name}</span>
                        <span className="block text-[12px] text-ink-muted">지도에서 보기</span>
                      </span>
                      <span className="num text-[15px] font-bold">{topZone[1].length}건</span>
                      <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                    </a>
                  </li>
                )}
              </ul>
              <a href="#/admin/analysis" className="flex h-12 items-center justify-center gap-2 rounded-full bg-surface text-[14px] font-bold text-ink-sub active:bg-line">
                더 자세히 분석하기
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
              {summary.patterns.length > 0 && (
                <p className="px-1 text-center text-[12px] text-ink-muted">
                  {CAUSE_BY_ID[summary.patterns[0].cause].label} 등 반복 구간 {summary.patterns.length}곳은 분석 탭에서 볼 수 있어요
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
