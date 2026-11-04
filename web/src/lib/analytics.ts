import type { CauseId, EventTypeId, IssueEvent, WeekRange, Zone } from "@/types/analytics";
import { CAUSES, EVENT_TYPES, ZONES } from "@/mockData/taxonomy";
import { formatDayKey, weekdayOf } from "./format";

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z])) as Record<string, Zone>;
export const TYPE_BY_ID = Object.fromEntries(EVENT_TYPES.map((t) => [t.id, t])) as Record<EventTypeId, (typeof EVENT_TYPES)[number]>;
export const CAUSE_BY_ID = Object.fromEntries(CAUSES.map((c) => [c.id, c])) as Record<CauseId, (typeof CAUSES)[number]>;

export type Pattern = {
  zoneId: string;
  cause: CauseId;
  count: number;
  prevCount: number;
};

export type Summary = {
  total: number;
  prevTotal: number;
  deltaPct: number;
  byType: { id: EventTypeId; label: string; count: number }[];
  byCause: { id: CauseId; label: string; count: number; share: number }[];
  daily: { day: string; weekday: string; count: number }[];
  patterns: Pattern[];
};

function addDays(startIso: string, n: number): string {
  const [y, m, d] = startIso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function summarize(current: IssueEvent[], previous: IssueEvent[], week: WeekRange): Summary {
  const total = current.length;
  const prevTotal = previous.length;
  const deltaPct = prevTotal === 0 ? 0 : Math.round(((total - prevTotal) / prevTotal) * 100);

  const byType = EVENT_TYPES.map((t) => ({
    id: t.id,
    label: t.label,
    count: current.filter((e) => e.type === t.id).length,
  })).sort((a, b) => b.count - a.count);

  const byCause = CAUSES.map((c) => {
    const count = current.filter((e) => e.cause === c.id).length;
    return { id: c.id, label: c.label, count, share: total === 0 ? 0 : count / total };
  })
    .filter((c) => c.id !== "unknown")
    .sort((a, b) => b.count - a.count);

  const daily = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(week.start, i);
    return { day, weekday: weekdayOf(day), count: current.filter((e) => formatDayKey(e.occurredAt) === day).length };
  });

  const groups = new Map<string, number>();
  current.forEach((e) => {
    if (e.cause === "unknown") return;
    const key = `${e.zoneId}|${e.cause}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  });
  const patterns: Pattern[] = [...groups.entries()]
    .map(([key, count]) => {
      const [zoneId, cause] = key.split("|") as [string, CauseId];
      const prevCount = previous.filter((e) => e.zoneId === zoneId && e.cause === cause).length;
      return { zoneId, cause, count, prevCount };
    })
    .filter((p) => p.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return { total, prevTotal, deltaPct, byType, byCause, daily, patterns };
}

export type EventFilter = {
  type?: EventTypeId;
  cause?: CauseId;
  zone?: string;
};

export function filterEvents(events: IssueEvent[], f: EventFilter): IssueEvent[] {
  return events.filter(
    (e) => (!f.type || e.type === f.type) && (!f.cause || e.cause === f.cause) && (!f.zone || e.zoneId === f.zone),
  );
}

export type SortKey = "latest" | "oldest" | "severity";

const SEVERITY_RANK = { high: 3, mid: 2, low: 1 } as const;

export function sortEvents(events: IssueEvent[], key: SortKey): IssueEvent[] {
  const out = [...events];
  if (key === "oldest") return out.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  if (key === "severity") {
    return out.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.occurredAt.localeCompare(a.occurredAt));
  }
  return out.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export function needsCheck(e: IssueEvent): boolean {
  return e.fields.some((f) => !f.value);
}

export type Facet = { key: string; label: string };

type Rule = { key: string; label: string; words: string[]; match: (e: IssueEvent) => boolean };

const zoneRule = (id: string, words: string[]): Rule => ({
  key: `zone-${id}`,
  label: ZONE_BY_ID[id].name,
  words,
  match: (e) => e.zoneId === id,
});

const RULES: Rule[] = [
  { key: "area-gangnam", label: "강남구", words: ["강남구", "강남"], match: (e) => ZONE_BY_ID[e.zoneId].area === "gangnam" },
  { key: "area-seongbuk", label: "성북구", words: ["성북구", "성북"], match: (e) => ZONE_BY_ID[e.zoneId].area === "seongbuk" },
  {
    key: "zone-gangnam-daero",
    label: "강남대로",
    words: ["강남대로"],
    match: (e) => e.zoneId === "gn-1" || e.zoneId === "gn-2",
  },
  zoneRule("gn-1", ["강남역"]),
  zoneRule("gn-2", ["102길"]),
  zoneRule("gn-3", ["역삼로"]),
  zoneRule("gn-4", ["테헤란로"]),
  zoneRule("gn-5", ["논현로"]),
  zoneRule("gn-6", ["도산대로"]),
  zoneRule("sb-1", ["안암오거리", "안암"]),
  zoneRule("sb-2", ["고려대", "정문"]),
  zoneRule("sb-3", ["종암로"]),
  zoneRule("sb-4", ["성북천"]),
  zoneRule("sb-5", ["삼선교"]),
  zoneRule("sb-6", ["보문로"]),
  { key: "cause-twoWheeler", label: "이륜차·킥보드", words: ["킥보드", "이륜차", "오토바이", "자전거", "스쿠터"], match: (e) => e.cause === "twoWheeler" },
  { key: "cause-pedestrian", label: "보행자", words: ["보행자", "무단횡단", "횡단", "행인"], match: (e) => e.cause === "pedestrian" },
  { key: "cause-vehicle", label: "차량 돌발", words: ["끼어들기", "역주행", "앞차", "차량"], match: (e) => e.cause === "vehicle" },
  { key: "cause-signal", label: "신호·교차로", words: ["신호", "교차로"], match: (e) => e.cause === "signal" },
  { key: "cause-obstacle", label: "공사·장애물", words: ["공사", "장애물", "주정차"], match: (e) => e.cause === "obstacle" },
  { key: "weather-rain", label: "비 오는 날", words: ["비 오는", "비오는", "빗길", "우천", "비가", "비"], match: (e) => e.weather === "비" },
  { key: "weather-cloud", label: "흐린 날", words: ["흐린", "흐림"], match: (e) => e.weather === "흐림" },
  { key: "weather-clear", label: "맑은 날", words: ["맑은", "맑음"], match: (e) => e.weather === "맑음" },
  { key: "type-hardBrake", label: "급정거", words: ["급정거", "급제동", "급브레이크"], match: (e) => e.type === "hardBrake" },
  { key: "type-hardAccel", label: "급가속", words: ["급가속"], match: (e) => e.type === "hardAccel" },
  { key: "type-hardSteer", label: "급조향", words: ["급조향", "급회전"], match: (e) => e.type === "hardSteer" },
  { key: "type-contact", label: "접촉 사고", words: ["접촉"], match: (e) => e.type === "contact" },
  { key: "type-collision", label: "충돌 사고", words: ["충돌"], match: (e) => e.type === "collision" },
];

const WORD_INDEX = RULES.flatMap((r) => r.words.map((w) => ({ word: w, rule: r }))).sort((a, b) => b.word.length - a.word.length);

const FILLERS = ["찾아줘", "보여줘", "알려줘", "해줘", "검색", "찾아", "관련", "사고", "이슈", "이벤트", "있었던", "에서", "좀", "날", "건"];

export type SearchResult = {
  facets: Facet[];
  unmatched: string[];
  results: IssueEvent[];
};

export function searchEvents(events: IssueEvent[], query: string): SearchResult {
  let rest = query.trim();
  if (!rest) return { facets: [], unmatched: [], results: [] };

  const matched: Rule[] = [];
  WORD_INDEX.forEach(({ word, rule }) => {
    if (matched.includes(rule)) return;
    if (rest.includes(word)) {
      matched.push(rule);
      rest = rest.replace(word, " ");
    }
  });

  FILLERS.forEach((f) => {
    rest = rest.split(f).join(" ");
  });
  const unmatched = rest
    .split(/[\s,.!?]+/)
    .map((t) => t.replace(/(을|를|이|가|은|는|의|도|만)$/, ""))
    .filter((t) => t.length >= 2);

  const results = events
    .filter((e) => matched.every((r) => r.match(e)))
    .filter((e) => unmatched.every((t) => e.title.includes(t) || e.transcript.includes(t)))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  return { facets: matched.map((r) => ({ key: r.key, label: r.label })), unmatched, results };
}

export function zoneCounts(events: IssueEvent[]): Map<string, IssueEvent[]> {
  const map = new Map<string, IssueEvent[]>();
  events.forEach((e) => {
    const list = map.get(e.zoneId) ?? [];
    list.push(e);
    map.set(e.zoneId, list);
  });
  return map;
}
