import { useEffect, useRef, useState, type ReactElement } from "react";
import { ArrowRight, Mic } from "lucide-react";
import type { HashRoute } from "@/lib/useHashRoute";
import { EVENTS_THIS_WEEK } from "@/mockData/events";
import Analysis from "./Analysis";
import EventDetail from "./EventDetail";
import EventList from "./EventList";
import MapView from "./MapView";
import Summary from "./Summary";
import TabBar, { type TabId } from "./TabBar";
import { SheetRootContext } from "./parts/Sheet";
import ToastHost from "./parts/ToastHost";

function resolve(path: string): { tab: TabId; node: (route: HashRoute) => ReactElement } {
  const detail = path.match(/^\/admin\/events\/([^/]+)$/);
  if (detail) return { tab: "events", node: (route) => <EventDetail key={detail[1]} id={detail[1]} route={route} /> };
  if (path === "/admin/events") return { tab: "events", node: (route) => <EventList route={route} /> };
  if (path === "/admin/analysis") return { tab: "analysis", node: (route) => <Analysis route={route} /> };
  if (path === "/admin/search") return { tab: "events", node: (route) => <EventList route={{ ...route, params: new URLSearchParams("focus=1") }} /> };
  if (path === "/admin/map") return { tab: "map", node: (route) => <MapView route={route} /> };
  return { tab: "summary", node: () => <Summary /> };
}

const sample = EVENTS_THIS_WEEK.find((e) => e.transcript.startsWith("삼거리에서")) ?? EVENTS_THIS_WEEK[0];

const FLOW = [
  { label: "한 주를 한눈에 파악", href: "/admin" },
  { label: "반복 패턴 확인", href: "/admin/analysis?s=recs" },
  { label: "미검토 이벤트 필터링", href: "/admin/events?st=new&sort=oldest" },
  { label: "상세에서 근거 확인·수정", href: `/admin/events/${sample.id}` },
  { label: "지도에서 반복 구간 보기", href: "/admin/map?zone=gn-2" },
  { label: "말하듯이 검색", href: "/admin/events?focus=1" },
];

function DesktopGuide() {
  return (
    <aside className="hidden w-[340px] shrink-0 flex-col gap-8 lg:flex">
      <div>
        <p className="text-[12px] font-bold tracking-[0.1em] text-ink-sub uppercase">Kakao Mobility × Korea University</p>
        <p className="mt-3 text-[34px] leading-tight font-extrabold tracking-tight">
          주행 이슈
          <br />
          분석 앱
        </p>
      </div>
      <ol className="flex flex-col gap-1">
        {FLOW.map((f, i) => (
          <li key={f.href}>
            <a href={`#${f.href}`} className="group flex items-center gap-3 rounded-[16px] px-3 py-2.5 transition-colors hover:bg-white">
              <span className="num flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-extrabold text-white">{i + 1}</span>
              <span className="text-[15px] font-bold">{f.label}</span>
              <ArrowRight className="ml-auto size-4 opacity-0 transition-opacity group-hover:opacity-60" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-2">
        <a href="#/" className="inline-flex h-12 items-center gap-2 self-start rounded-full bg-kakao px-5 text-[14px] font-extrabold">
          <Mic className="size-4" aria-hidden="true" />
          오퍼레이터 녹음 화면 보기
        </a>
      </div>
    </aside>
  );
}

export default function Dashboard({ route }: { route: HashRoute }) {
  const scroller = useRef<HTMLElement>(null);
  const [sheetRoot, setSheetRoot] = useState<HTMLElement | null>(null);
  const { tab, node } = resolve(route.path);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [route.path]);

  return (
    <div className="app-shell lg:flex lg:items-center lg:justify-center lg:gap-20 lg:bg-[#e9ebee] lg:p-6">
      <DesktopGuide />
      <div onScroll={(e) => { e.currentTarget.scrollTop = 0; e.currentTarget.scrollLeft = 0; }} className="app-frame relative mx-auto flex w-full max-w-[430px] flex-col overflow-hidden bg-page lg:mx-0 lg:w-[400px] lg:rounded-[44px] lg:border-[10px] lg:border-ink lg:shadow-[0_30px_80px_rgba(25,25,25,0.25)]">
        <SheetRootContext.Provider value={sheetRoot}>
          <main ref={scroller} className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {node(route)}
          </main>
          <TabBar active={tab} />
          <div ref={setSheetRoot} className="pointer-events-none absolute inset-0 z-40" />
          <ToastHost />
        </SheetRootContext.Provider>
      </div>
    </div>
  );
}
