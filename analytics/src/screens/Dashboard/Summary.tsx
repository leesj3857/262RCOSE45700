import { useMemo } from "react";
import { ArrowRight, ChevronRight, CircleCheck, Inbox, Mic } from "lucide-react";
import { summarize } from "@/lib/analytics";
import { buildRecommendations } from "@/lib/recommendations";
import { eventsHref } from "@/lib/filters";
import { baselineName, periodLabel } from "@/lib/scope";
import { navigate } from "@/lib/useHashRoute";
import { prefsStore } from "@/state/userData";
import { useScopeData } from "@/state/useScopeData";
import EmptyState from "./parts/EmptyState";
import PageHeader from "./parts/PageHeader";
import RecCard from "./parts/RecCard";
import ScopeBar from "./parts/ScopeBar";

type Todo = { key: string; count: number; title: string; href: string; tone: "danger" | "ink" };

export default function Summary() {
  const { scope, range, events, baseline, scopedAll } = useScopeData();
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
      title: "사고",
      href: eventsHref({ sev: ["high"], st: ["new", "flagged"], sort: "severity" }),
      tone: "danger" as const,
    },
    {
      key: "new",
      count: summary.byStatus.new,
      title: "미검토",
      href: eventsHref({ st: ["new"], sort: "oldest" }),
      tone: "ink" as const,
    },
    {
      key: "check",
      count: summary.checkCount,
      title: "확인 필요",
      href: eventsHref({ check: true, sort: "check" }),
      tone: "ink" as const,
    },
  ].filter((t) => t.count > 0);

  const typeRows = [...summary.byType].filter((t) => t.count > 0).sort((a, b) => b.count - a.count);
  const typeMax = Math.max(1, ...typeRows.map((t) => t.count));
  const causeRows = [...summary.byCause].filter((c) => c.count > 0).sort((a, b) => b.count - a.count).slice(0, 3);

  return (
    <>
      <ScopeBar />
      <PageHeader
        title="요약"
        right={
          <a href="#/" aria-label="녹음 화면으로" className="flex h-11 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-bold text-ink-sub shadow-card active:bg-surface">
              <Mic className="size-4" aria-hidden="true" />
              녹음
            </a>
        }
      />

      <div className="flex flex-col gap-6 px-5 pt-1 pb-8">
        {total === 0 ? (
          <EmptyState icon={<Inbox className="size-6" aria-hidden="true" />} title="기록이 없어요" description="기간이나 차량을 바꿔 보세요" />
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
            </section>

            <section aria-label="유형별" className="flex flex-col gap-3">
              <h2 className="px-1 text-[18px] font-extrabold tracking-tight">유형별</h2>
              <ul className="flex flex-col rounded-panel bg-white shadow-card p-2">
                {typeRows.map((t) => (
                  <li key={t.id}>
                    <a href={`#${eventsHref({ type: [t.id] })}`} className="flex items-center gap-3 rounded-[20px] px-4 py-3 active:bg-surface">
                      <span className="w-[76px] shrink-0 text-[15px] font-bold">{t.label}</span>
                      <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface">
                        <span className="block h-full rounded-full bg-blue" style={{ width: `${(t.count / typeMax) * 100}%` }} />
                      </span>
                      <span className="num w-12 shrink-0 text-right text-[15px] font-extrabold">{t.count}건</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="원인별" className="flex flex-col gap-3">
              <div className="flex items-end justify-between px-1">
                <h2 className="text-[18px] font-extrabold tracking-tight">많은 원인</h2>
                <a href="#/admin/analysis?s=cause" className="inline-flex h-10 items-center gap-0.5 text-[13px] font-bold text-ink-sub">
                  전체 보기
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </a>
              </div>
              <ul className="flex flex-col rounded-panel bg-white shadow-card p-2">
                {causeRows.map((c) => (
                  <li key={c.id}>
                    <a href={`#${eventsHref({ cause: [c.id] })}`} className="flex items-center gap-3 rounded-[20px] px-4 py-3 active:bg-surface">
                      <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{c.label}</span>
                      <span className="num text-[15px] font-extrabold">{c.count}건</span>
                      <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="지금 할 일" className="flex flex-col gap-3">
              <div className="flex items-end justify-between px-1">
                <h2 className="text-[18px] font-extrabold tracking-tight">지금 할 일</h2>
                <span className="num text-[13px] font-bold text-ink-sub">
                  검토 {reviewed}/{total}건
                </span>
              </div>
              <div className="rounded-panel bg-white p-5 shadow-card">
                <div className="flex h-2 overflow-hidden rounded-full bg-surface" role="img" aria-label={`전체 ${total}건 중 ${reviewed}건 검토 완료`}>
                  <span className="bg-ok" style={{ width: `${(reviewed / total) * 100}%` }} />
                  <span className="bg-warning" style={{ width: `${(summary.byStatus.flagged / total) * 100}%` }} />
                </div>
                {todos.length === 0 ? (
                  <p className="mt-4 flex items-center justify-center gap-2 text-[14px] font-bold text-[#0f7a42]">
                    <CircleCheck className="size-5" aria-hidden="true" />
                    모두 검토했어요
                  </p>
                ) : (
                  <ul className="mt-4 grid grid-flow-col auto-cols-fr divide-x divide-line">
                    {todos.map((t) => (
                      <li key={t.key}>
                        <a href={`#${t.href}`} className="flex flex-col items-center gap-1 rounded-[16px] py-2 active:bg-surface">
                          <span className={`num text-[30px] leading-none font-extrabold ${t.tone === "danger" ? "text-danger" : ""}`}>{t.count}</span>
                          <span className="text-[13px] font-semibold text-ink-sub">{t.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {recs.length > 0 && (
              <section aria-label="반복 패턴" className="flex flex-col gap-3">
                <div className="flex items-end justify-between gap-3 px-1">
                  <h2 className="text-[18px] font-extrabold tracking-tight">반복 패턴</h2>
                  {recs.length > 1 && (
                    <a href="#/admin/analysis?s=recs" className="inline-flex h-10 items-center gap-0.5 text-[13px] font-bold text-ink-sub">
                      {recs.length}건 모두 보기
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
                <RecCard rec={recs.find((r) => r.kind === "hotspot") ?? recs[0]} />
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
