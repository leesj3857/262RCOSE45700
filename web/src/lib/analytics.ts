import type { CauseId, DateRange, EventTypeId, IssueEvent, Severity, Status } from "@/types/analytics";
import { CAUSES, EVENT_TYPES, VEHICLES } from "@/mockData/taxonomy";
import { WEEKS } from "@/mockData/events";
import { addDays, daysIn, dayOf, hourOf, inRange, shortDay, weekdayIndex, weekdayOfDay } from "./dates";
import { ZONE_BY_ID } from "./zones";

export { ZONE_BY_ID };

export const TYPE_BY_ID = Object.fromEntries(EVENT_TYPES.map((t) => [t.id, t])) as Record<EventTypeId, (typeof EVENT_TYPES)[number]>;
export const CAUSE_BY_ID = Object.fromEntries(CAUSES.map((c) => [c.id, c])) as Record<CauseId, (typeof CAUSES)[number]>;

export function needsCheck(e: IssueEvent): boolean {
  return e.fields.some((f) => !f.value);
}

export function lowConfidence(e: IssueEvent): boolean {
  return e.fields.some((f) => f.confidence !== null && f.confidence < 0.85 && !f.edited);
}

export function minConfidence(e: IssueEvent): number {
  const values = e.fields.map((f) => f.confidence).filter((c): c is number => c !== null);
  return values.length ? Math.min(...values) : 0;
}

export function pctChange(now: number, before: number | null | undefined): number | null {
  if (before === null || before === undefined || before === 0) return null;
  return Math.round(((now - before) / before) * 100);
}

export type Bucket = { key: string; label: string; sub: string; start: string; end: string; count: number };

export function bucketize(events: IssueEvent[], range: DateRange): Bucket[] {
  const len = daysIn(range);
  const out: Bucket[] = [];
  if (len <= 14) {
    for (let i = 0; i < len; i++) {
      const day = addDays(range.start, i);
      out.push({
        key: day,
        label: weekdayOfDay(day),
        sub: shortDay(day),
        start: day,
        end: day,
        count: events.filter((e) => dayOf(e.occurredAt) === day).length,
      });
    }
    return out;
  }
  for (let i = 0; i < len; i += 7) {
    const start = addDays(range.start, i);
    const end = addDays(range.start, Math.min(i + 6, len - 1));
    out.push({
      key: start,
      label: shortDay(start),
      sub: `~${shortDay(end)}`,
      start,
      end,
      count: events.filter((e) => inRange(e.occurredAt, { start, end })).length,
    });
  }
  return out;
}

export type Pattern = {
  zoneId: string;
  cause: CauseId;
  count: number;
  prevCount: number | null;
};

export type Summary = {
  total: number;
  baselineTotal: number | null;
  deltaPct: number | null;
  byType: { id: EventTypeId; label: string; count: number; prev: number | null }[];
  byCause: { id: CauseId; label: string; count: number; share: number; prev: number | null }[];
  bySeverity: Record<Severity, number>;
  byStatus: Record<Status, number>;
  checkCount: number;
  buckets: Bucket[];
  patterns: Pattern[];
};

export function summarize(events: IssueEvent[], baseline: IssueEvent[] | null, range: DateRange): Summary {
  const total = events.length;
  const baselineTotal = baseline ? baseline.length : null;

  const byType = EVENT_TYPES.map((t) => ({
    id: t.id,
    label: t.label,
    count: events.filter((e) => e.type === t.id).length,
    prev: baseline ? baseline.filter((e) => e.type === t.id).length : null,
  })).sort((a, b) => b.count - a.count);

  const byCause = CAUSES.filter((c) => c.id !== "unknown")
    .map((c) => {
      const count = events.filter((e) => e.cause === c.id).length;
      return {
        id: c.id,
        label: c.label,
        count,
        share: total === 0 ? 0 : count / total,
        prev: baseline ? baseline.filter((e) => e.cause === c.id).length : null,
      };
    })
    .sort((a, b) => b.count - a.count);

  const bySeverity: Record<Severity, number> = { low: 0, mid: 0, high: 0 };
  const byStatus: Record<Status, number> = { new: 0, reviewed: 0, flagged: 0 };
  events.forEach((e) => {
    bySeverity[e.severity] += 1;
    byStatus[e.status] += 1;
  });

  const groups = new Map<string, number>();
  events.forEach((e) => {
    if (e.cause === "unknown") return;
    const key = `${e.zoneId}|${e.cause}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  });

  const minCount = Math.max(3, Math.round(daysIn(range) / 7) * 3);
  const patterns: Pattern[] = [...groups.entries()]
    .map(([key, count]) => {
      const [zoneId, cause] = key.split("|") as [string, CauseId];
      return {
        zoneId,
        cause,
        count,
        prevCount: baseline ? baseline.filter((e) => e.zoneId === zoneId && e.cause === cause).length : null,
      };
    })
    .filter((p) => p.count >= minCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total,
    baselineTotal,
    deltaPct: pctChange(total, baselineTotal),
    byType,
    byCause,
    bySeverity,
    byStatus,
    checkCount: events.filter(needsCheck).length,
    buckets: bucketize(events, range),
    patterns,
  };
}

export type WeekPoint = {
  index: number;
  range: DateRange;
  label: string;
  total: number;
  byType: Record<EventTypeId, number>;
};

export function weeklySeries(events: IssueEvent[]): WeekPoint[] {
  return WEEKS.map((range, index) => {
    const inWeek = events.filter((e) => inRange(e.occurredAt, range));
    const byType = Object.fromEntries(EVENT_TYPES.map((t) => [t.id, inWeek.filter((e) => e.type === t.id).length])) as Record<EventTypeId, number>;
    return { index, range, label: shortDay(range.start), total: inWeek.length, byType };
  });
}

export function zoneCauseSeries(events: IssueEvent[], zoneId: string, cause?: CauseId): number[] {
  return WEEKS.map(
    (range) => events.filter((e) => e.zoneId === zoneId && (!cause || e.cause === cause) && inRange(e.occurredAt, range)).length,
  );
}

export function hourMatrix(events: IssueEvent[]): number[][] {
  const matrix = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  events.forEach((e) => {
    matrix[weekdayIndex(e.occurredAt)][hourOf(e.occurredAt)] += 1;
  });
  return matrix;
}

export type VehicleStat = {
  id: string;
  plate: string;
  count: number;
  prevCount: number | null;
  km: number;
  rate: number;
  versusFleet: number;
};

export function vehicleStats(events: IssueEvent[], baseline: IssueEvent[] | null, range: DateRange): VehicleStat[] {
  const weeks = daysIn(range) / 7;
  const rows = VEHICLES.map((v) => {
    const count = events.filter((e) => e.vehicleId === v.id).length;
    const km = Math.round(v.weeklyKm * weeks);
    return {
      id: v.id,
      plate: v.plate,
      count,
      prevCount: baseline ? baseline.filter((e) => e.vehicleId === v.id).length : null,
      km,
      rate: km === 0 ? 0 : (count / km) * 1000,
    };
  });
  const active = rows.filter((r) => r.count > 0 || events.length === 0);
  const totalKm = active.reduce((a, r) => a + r.km, 0);
  const totalCount = active.reduce((a, r) => a + r.count, 0);
  const fleet = totalKm === 0 ? 0 : (totalCount / totalKm) * 1000;
  return rows
    .map((r) => ({ ...r, versusFleet: fleet === 0 ? 0 : Math.round(((r.rate - fleet) / fleet) * 100) }))
    .sort((a, b) => b.rate - a.rate);
}

export function fleetRate(stats: VehicleStat[]): number {
  const km = stats.reduce((a, r) => a + r.km, 0);
  const count = stats.reduce((a, r) => a + r.count, 0);
  return km === 0 ? 0 : (count / km) * 1000;
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

export function topWindow(matrix: number[][], width = 3): { from: number; count: number; share: number } {
  const perHour = Array<number>(24).fill(0);
  matrix.forEach((row) => row.forEach((c, h) => (perHour[h] += c)));
  const total = perHour.reduce((a, b) => a + b, 0);
  let best = { from: 0, count: 0, share: 0 };
  for (let h = 0; h + width <= 24; h++) {
    const count = perHour.slice(h, h + width).reduce((a, b) => a + b, 0);
    if (count > best.count) best = { from: h, count, share: total === 0 ? 0 : count / total };
  }
  return best;
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
  { key: "zone-gangnam-daero", label: "강남대로", words: ["강남대로"], match: (e) => e.zoneId === "gn-1" || e.zoneId === "gn-2" },
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
  { key: "hour-evening", label: "퇴근 시간", words: ["퇴근", "저녁"], match: (e) => hourOf(e.occurredAt) >= 17 && hourOf(e.occurredAt) <= 20 },
  { key: "hour-morning", label: "출근 시간", words: ["출근", "아침"], match: (e) => hourOf(e.occurredAt) >= 7 && hourOf(e.occurredAt) <= 10 },
  { key: "sev-high", label: "심각도 높음", words: ["심각", "위험"], match: (e) => e.severity === "high" },
  { key: "check", label: "확인 필요", words: ["확인 필요", "확인필요", "비어"], match: (e) => needsCheck(e) },
  { key: "type-hardBrake", label: "급정거", words: ["급정거", "급제동", "급브레이크"], match: (e) => e.type === "hardBrake" },
  { key: "type-hardAccel", label: "급가속", words: ["급가속"], match: (e) => e.type === "hardAccel" },
  { key: "type-hardSteer", label: "급조향", words: ["급조향", "급회전"], match: (e) => e.type === "hardSteer" },
  { key: "type-contact", label: "접촉 사고", words: ["접촉"], match: (e) => e.type === "contact" },
  { key: "type-collision", label: "충돌 사고", words: ["충돌"], match: (e) => e.type === "collision" },
];

const WORD_INDEX = RULES.flatMap((r) => r.words.map((w) => ({ word: w, rule: r }))).sort((a, b) => b.word.length - a.word.length);

const FILLERS = ["찾아줘", "보여줘", "알려줘", "해줘", "검색", "찾아", "관련", "사고", "이슈", "이벤트", "있었던", "에서", "좀", "날", "건", "시간"];

export type SearchResult = {
  facets: Facet[];
  unmatched: string[];
  results: IssueEvent[];
};

export function searchEvents(events: IssueEvent[], query: string, excluded: string[] = []): SearchResult {
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

  const active = matched.filter((r) => !excluded.includes(r.key));
  const results = events
    .filter((e) => active.every((r) => r.match(e)))
    .filter((e) => unmatched.every((t) => e.title.includes(t) || e.transcript.includes(t)))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  return { facets: matched.map((r) => ({ key: r.key, label: r.label })), unmatched, results };
}
