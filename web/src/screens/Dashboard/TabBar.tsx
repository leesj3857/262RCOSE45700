import { ChartColumn, LayoutDashboard, List, Map as MapIcon } from "lucide-react";

export type TabId = "summary" | "events" | "analysis" | "map";

const TABS = [
  { id: "summary", label: "요약", href: "/admin", Icon: LayoutDashboard },
  { id: "events", label: "이벤트", href: "/admin/events", Icon: List },
  { id: "analysis", label: "분석", href: "/admin/analysis", Icon: ChartColumn },
  { id: "map", label: "지도", href: "/admin/map", Icon: MapIcon },
] as const;

export default function TabBar({ active }: { active: TabId }) {
  return (
    <nav aria-label="관리자 메뉴" className="shrink-0 bg-page px-4 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]">
      <ul className="grid grid-cols-4 gap-1 rounded-[28px] bg-white p-1.5 shadow-float">
        {TABS.map(({ id, label, href, Icon }) => {
          const on = id === active;
          return (
            <li key={id}>
              <a
                href={`#${href}`}
                aria-current={on ? "page" : undefined}
                className={`flex h-[56px] flex-col items-center justify-center gap-0.5 rounded-[22px] transition-colors ${on ? "bg-kakao" : "active:bg-surface"}`}
              >
                <Icon className={`size-[22px] ${on ? "text-ink" : "text-ink-muted"}`} strokeWidth={on ? 2.4 : 2} aria-hidden="true" />
                <span className={`text-[11px] ${on ? "font-extrabold text-ink" : "font-semibold text-ink-muted"}`}>{label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
