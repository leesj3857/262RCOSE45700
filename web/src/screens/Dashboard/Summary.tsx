import { ArrowDownRight, ArrowRight, ArrowUpRight, Mic, Minus, Repeat } from "lucide-react";
import { CAUSE_BY_ID, summarize, ZONE_BY_ID } from "@/lib/analytics";
import { formatRange } from "@/lib/format";
import { eventsLink } from "@/lib/useHashRoute";
import { EVENTS_PREV_WEEK, EVENTS_THIS_WEEK, THIS_WEEK } from "@/mockData/events";
import PageHeader from "./parts/PageHeader";

const summary = summarize(EVENTS_THIS_WEEK, EVENTS_PREV_WEEK, THIS_WEEK);

function DeltaChip({ pct }: { pct: number }) {
  const Icon = pct < 0 ? ArrowDownRight : pct > 0 ? ArrowUpRight : Minus;
  const text = pct === 0 ? "전주와 동일" : `전주 대비 ${Math.abs(pct)}% ${pct < 0 ? "감소" : "증가"}`;
  return (
    <span className="inline-flex h-8 items-center gap-1 rounded-full bg-white/10 pr-3 pl-2 text-[13px] font-bold text-white">
      <Icon className="size-4 text-kakao" strokeWidth={2.6} aria-hidden="true" />
      {text}
    </span>
  );
}

function HeroCard() {
  const max = Math.max(...summary.daily.map((d) => d.count));
  return (
    <section aria-label="이번 주 이벤트 기록" className="overflow-hidden rounded-panel bg-navy p-6 text-white">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[14px] font-semibold text-white/70">이번 주 이벤트 기록</p>
          <p className="num mt-0.5 text-[12px] text-white/45">{formatRange(THIS_WEEK.start, THIS_WEEK.end)}</p>
        </div>
        <DeltaChip pct={summary.deltaPct} />
      </div>

      <p className="num mt-5 text-[68px] leading-none font-extrabold text-kakao">
        {summary.total}
        <span className="ml-1 text-[28px] font-bold text-white">건</span>
      </p>

      <div className="mt-7 flex h-[104px] items-end justify-between gap-2">
        {summary.daily.map((d) => {
          const peak = d.count === max;
          return (
            <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-1.5">
              <span className={`num text-[12px] font-bold ${peak ? "text-kakao" : "text-white/55"}`}>{d.count}</span>
              <div
                className={`w-full rounded-[8px] ${peak ? "bg-kakao" : "bg-white/20"}`}
                style={{ height: `${Math.max(8, (d.count / max) * 64)}px` }}
              />
              <span className="text-[12px] font-medium text-white/55">{d.weekday}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TypeBreakdown() {
  const max = summary.byType[0].count;
  return (
    <section aria-label="유형별 집계" className="rounded-panel border border-line bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[17px] font-extrabold">유형별 집계</h2>
        <a href="#/admin/events" className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-ink-muted">
          전체 보기
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </a>
      </div>
      <ul className="flex flex-col gap-1">
        {summary.byType.map((t) => (
          <li key={t.id}>
            <a
              href={`#${eventsLink({ type: t.id })}`}
              className="flex items-center gap-3 rounded-[14px] px-2 py-2.5 transition-colors active:bg-surface"
            >
              <span className="w-[72px] shrink-0 text-[14px] font-semibold text-ink-sub">{t.label}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
                <span className="block h-full rounded-full bg-kakao" style={{ width: `${(t.count / max) * 100}%` }} />
              </span>
              <span className="num w-11 shrink-0 text-right text-[16px] font-extrabold">{t.count}건</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TopCauses() {
  const top = summary.byCause.slice(0, 3);
  return (
    <section aria-label="최다 원인" className="flex flex-col gap-3">
      <h2 className="px-1 text-[17px] font-extrabold">최다 원인</h2>
      <div className="grid grid-cols-1 gap-2.5">
        {top.map((c, i) => (
          <a
            key={c.id}
            href={`#${eventsLink({ cause: c.id })}`}
            className={`flex items-center gap-4 rounded-[20px] p-4 transition-transform active:scale-[0.99] ${
              i === 0 ? "bg-kakao" : "bg-surface"
            }`}
          >
            <span className="num flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-[16px] font-extrabold text-white">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-bold">{c.label}</span>
              <span className="mt-0.5 block text-[13px] font-medium text-ink/60">전체의 {Math.round(c.share * 100)}%</span>
            </span>
            <span className="num text-[26px] font-extrabold">
              {c.count}
              <span className="ml-0.5 text-[15px] font-bold">건</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function Patterns() {
  return (
    <section aria-label="반복 패턴" className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <Repeat className="size-4" strokeWidth={2.6} aria-hidden="true" />
        <h2 className="text-[17px] font-extrabold">반복 패턴</h2>
        <span className="ml-auto text-[12px] font-medium text-ink-muted">같은 장소 · 같은 원인 3회 이상</span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {summary.patterns.map((p) => {
          const diff = p.count - p.prevCount;
          return (
            <li key={`${p.zoneId}-${p.cause}`}>
              <a
                href={`#${eventsLink({ zone: p.zoneId, cause: p.cause })}`}
                className="flex items-center gap-4 rounded-[20px] border border-line bg-white p-4 transition-colors active:bg-surface"
              >
                <span className="h-12 w-1.5 shrink-0 rounded-full bg-kakao" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-bold">{ZONE_BY_ID[p.zoneId].name}</span>
                  <span className="mt-0.5 block text-[13px] text-ink-muted">{CAUSE_BY_ID[p.cause].label}</span>
                </span>
                <span className="text-right">
                  <span className="num block text-[22px] leading-none font-extrabold">
                    {p.count}
                    <span className="ml-0.5 text-[14px] font-bold">회</span>
                  </span>
                  <span
                    className={`num mt-1 block text-[12px] font-bold ${diff > 0 ? "text-danger" : diff < 0 ? "text-ok" : "text-ink-muted"}`}
                  >
                    {diff === 0 ? "전주 동일" : `전주 대비 ${diff > 0 ? "+" : ""}${diff}`}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function Summary() {
  return (
    <>
      <PageHeader
        eyebrow="Kakao Mobility · 운영 관리자"
        title="주간 이슈 요약"
        right={
          <a
            href="#/"
            aria-label="녹음 화면으로"
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-surface px-4 text-[13px] font-bold text-ink-sub active:bg-line"
          >
            <Mic className="size-4" aria-hidden="true" />
            녹음 화면
          </a>
        }
      />
      <div className="flex flex-col gap-6 px-5 pb-8">
        <HeroCard />
        <TypeBreakdown />
        <TopCauses />
        <Patterns />
        <p className="px-1 text-center text-[12px] text-ink-muted">예시 데이터로 구성한 화면입니다. 서버 연결 전 흐름 확인용이에요.</p>
      </div>
    </>
  );
}
