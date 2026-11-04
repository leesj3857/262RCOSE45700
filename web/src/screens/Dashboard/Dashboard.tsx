import { useEffect, useRef, type ReactElement } from "react";
import type { HashRoute } from "@/lib/useHashRoute";
import EventDetail from "./EventDetail";
import EventList from "./EventList";
import MapView from "./MapView";
import Search from "./Search";
import Summary from "./Summary";
import TabBar, { type TabId } from "./TabBar";

function resolve(path: string): { tab: TabId; node: (route: HashRoute) => ReactElement } {
  const detail = path.match(/^\/admin\/events\/([^/]+)$/);
  if (detail) return { tab: "events", node: () => <EventDetail key={detail[1]} id={detail[1]} /> };
  if (path === "/admin/events") return { tab: "events", node: (route) => <EventList route={route} /> };
  if (path === "/admin/search") return { tab: "search", node: () => <Search /> };
  if (path === "/admin/map") return { tab: "map", node: () => <MapView /> };
  return { tab: "summary", node: () => <Summary /> };
}

export default function Dashboard({ route }: { route: HashRoute }) {
  const scroller = useRef<HTMLDivElement>(null);
  const { tab, node } = resolve(route.path);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [route.path]);

  return (
    <div className="app-frame mx-auto flex h-dvh w-full max-w-[430px] flex-col bg-white">
      <main ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        {node(route)}
      </main>
      <TabBar active={tab} />
    </div>
  );
}
