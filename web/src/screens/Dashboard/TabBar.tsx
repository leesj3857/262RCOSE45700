import { ChartColumn, LayoutDashboard, List, Map as MapIcon, Search } from "lucide-react";

export type TabId = "summary" | "events" | "analysis" | "map" | "search";

const TABS = [
  { id: "summary", label: "요약", href: "/admin", Icon: LayoutDashboard },
  { id: "events", label: "이벤트", href: "/admin/events", Icon: List },
  { id: "analysis", label: "분석", href: "/admin/analysis", Icon: ChartColumn },
  { id: "map", label: "지도", href: "/admin/map", Icon: MapIcon },
  { id: "search", label: "검색", href: "/admin/search", Icon: Search },
] as const;

export default function TabBar({ active }: { active: TabId }) {
  return (
    <nav aria-label="관리자 메뉴" className="shrink-0 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {TABS.map(({ id, label, href, Icon }) => {
          const on = id === active;
          return (
            <li key={id}>
              <a
                href={`#${href}`}
                aria-current={on ? "page" : undefined}
                className="flex h-[66px] flex-col items-center justify-center gap-1 active:bg-surface"
              >
                <span className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${on ? "bg-kakao" : ""}`}>
                  <Icon className={`size-[22px] ${on ? "text-ink" : "text-ink-muted"}`} strokeWidth={on ? 2.6 : 2} aria-hidden="true" />
                </span>
                <span className={`text-[11px] ${on ? "font-extrabold text-ink" : "font-semibold text-ink-muted"}`}>{label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
