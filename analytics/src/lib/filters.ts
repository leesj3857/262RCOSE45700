import type { CauseId, EventTypeId, IssueEvent, Severity, Status } from "@/types/analytics";
import { CAUSES, EVENT_TYPES } from "@/mockData/taxonomy";
import { dayOf, hourOf, weekdayIndex, weekdayLabel, dotDay } from "./dates";
import { minConfidence, needsCheck, searchEvents, type SearchResult } from "./analytics";
import { ZONE_BY_ID } from "./zones";

export type SortKey = "latest" | "oldest" | "severity" | "check";

export type Filters = {
  type: EventTypeId[];
  cause: CauseId[];
  sev: Severity[];
  wx: string[];
  st: Status[];
  zone: string[];
  check: boolean;
  star: boolean;
  hr: [number, number] | null;
  wd: number | null;
  df: string;
  dt: string;
  sort: SortKey;
};

export const EMPTY_FILTERS: Filters = {
  type: [],
  cause: [],
  sev: [],
  wx: [],
  st: [],
  zone: [],
  check: false,
  star: false,
  hr: null,
  wd: null,
  df: "",
  dt: "",
  sort: "latest",
};

export const SORTS: { id: SortKey; label: string; hint: string }[] = [
  { id: "latest", label: "최신순", hint: "가장 최근 이벤트부터" },
  { id: "oldest", label: "오래된순", hint: "먼저 발생한 이벤트부터" },
  { id: "severity", label: "심각도순", hint: "사고·위험 이벤트 먼저" },
  { id: "check", label: "확인 우선", hint: "비어 있거나 신뢰도가 낮은 항목 먼저" },
];

export const STATUS_LABEL: Record<Status, string> = { new: "미검토", reviewed: "검토 완료", flagged: "조치 필요" };
export const SEVERITY_LABEL: Record<Severity, string> = { low: "낮음", mid: "주의", high: "높음" };

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

export function parseFilters(params: URLSearchParams): Filters {
  const hr = params.get("hr");
  const wd = params.get("wd");
  const sort = params.get("sort") as SortKey | null;
  const hrParts = hr ? hr.split("-").map(Number) : [];
  return {
    type: list(params.get("type")) as EventTypeId[],
    cause: list(params.get("cause")) as CauseId[],
    sev: list(params.get("sev")) as Severity[],
    wx: list(params.get("wx")),
    st: list(params.get("st")) as Status[],
    zone: list(params.get("zone")),
    check: params.get("check") === "1",
    star: params.get("star") === "1",
    hr: hrParts.length === 2 && hrParts.every((n) => !Number.isNaN(n)) ? [hrParts[0], hrParts[1]] : null,
    wd: wd !== null && wd !== "" && !Number.isNaN(Number(wd)) ? Number(wd) : null,
    df: params.get("df") ?? "",
    dt: params.get("dt") ?? "",
    sort: sort && SORTS.some((s) => s.id === sort) ? sort : "latest",
  };
}

export function filtersToQuery(f: Filters): string {
  const q = new URLSearchParams();
  if (f.type.length) q.set("type", f.type.join(","));
  if (f.cause.length) q.set("cause", f.cause.join(","));
  if (f.sev.length) q.set("sev", f.sev.join(","));
  if (f.wx.length) q.set("wx", f.wx.join(","));
  if (f.st.length) q.set("st", f.st.join(","));
  if (f.zone.length) q.set("zone", f.zone.join(","));
  if (f.check) q.set("check", "1");
  if (f.star) q.set("star", "1");
  if (f.hr) q.set("hr", `${f.hr[0]}-${f.hr[1]}`);
  if (f.wd !== null) q.set("wd", String(f.wd));
  if (f.df) q.set("df", f.df);
  if (f.dt) q.set("dt", f.dt);
  if (f.sort !== "latest") q.set("sort", f.sort);
  return q.toString();
}

export function eventsHref(patch: Partial<Filters> = {}): string {
  const q = filtersToQuery({ ...EMPTY_FILTERS, ...patch });
  return `/admin/events${q ? `?${q}` : ""}`;
}

export function activeCount(f: Filters): number {
  return (
    f.type.length +
    f.cause.length +
    f.sev.length +
    f.wx.length +
    f.st.length +
    f.zone.length +
    (f.check ? 1 : 0) +
    (f.star ? 1 : 0) +
    (f.hr ? 1 : 0) +
    (f.wd !== null ? 1 : 0) +
    (f.df || f.dt ? 1 : 0)
  );
}

const SEVERITY_RANK: Record<Severity, number> = { high: 3, mid: 2, low: 1 };

export function sortEvents(events: IssueEvent[], key: SortKey): IssueEvent[] {
  const out = [...events];
  switch (key) {
    case "oldest":
      return out.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    case "severity":
      return out.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.occurredAt.localeCompare(a.occurredAt));
    case "check":
      return out.sort((a, b) => Number(needsCheck(b)) - Number(needsCheck(a)) || minConfidence(a) - minConfidence(b) || b.occurredAt.localeCompare(a.occurredAt));
    default:
      return out.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }
}

export function applyFilters(events: IssueEvent[], f: Filters): IssueEvent[] {
  const filtered = events.filter((e) => {
    if (f.type.length && !f.type.includes(e.type)) return false;
    if (f.cause.length && !f.cause.includes(e.cause)) return false;
    if (f.sev.length && !f.sev.includes(e.severity)) return false;
    if (f.wx.length && !f.wx.includes(e.weather || "미기록")) return false;
    if (f.st.length && !f.st.includes(e.status)) return false;
    if (f.zone.length && !f.zone.includes(e.zoneId)) return false;
    if (f.check && !needsCheck(e)) return false;
    if (f.star && !e.starred) return false;
    if (f.hr) {
      const h = hourOf(e.occurredAt);
      if (h < f.hr[0] || h > f.hr[1]) return false;
    }
    if (f.wd !== null && weekdayIndex(e.occurredAt) !== f.wd) return false;
    if (f.df && dayOf(e.occurredAt) < f.df) return false;
    if (f.dt && dayOf(e.occurredAt) > f.dt) return false;
    return true;
  });
  return sortEvents(filtered, f.sort);
}

export type FilterChip = { key: string; label: string; clear: (f: Filters) => Filters };

export function describeFilters(f: Filters): FilterChip[] {
  const chips: FilterChip[] = [];
  f.type.forEach((t) =>
    chips.push({ key: `type-${t}`, label: EVENT_TYPES.find((x) => x.id === t)?.label ?? t, clear: (s) => ({ ...s, type: s.type.filter((x) => x !== t) }) }),
  );
  f.cause.forEach((c) =>
    chips.push({ key: `cause-${c}`, label: CAUSES.find((x) => x.id === c)?.label ?? c, clear: (s) => ({ ...s, cause: s.cause.filter((x) => x !== c) }) }),
  );
  f.sev.forEach((v) =>
    chips.push({ key: `sev-${v}`, label: `심각도 ${SEVERITY_LABEL[v]}`, clear: (s) => ({ ...s, sev: s.sev.filter((x) => x !== v) }) }),
  );
  f.wx.forEach((w) => chips.push({ key: `wx-${w}`, label: `날씨 ${w}`, clear: (s) => ({ ...s, wx: s.wx.filter((x) => x !== w) }) }));
  f.st.forEach((v) => chips.push({ key: `st-${v}`, label: STATUS_LABEL[v], clear: (s) => ({ ...s, st: s.st.filter((x) => x !== v) }) }));
  f.zone.forEach((z) => chips.push({ key: `zone-${z}`, label: ZONE_BY_ID[z]?.name ?? z, clear: (s) => ({ ...s, zone: s.zone.filter((x) => x !== z) }) }));
  if (f.check) chips.push({ key: "check", label: "확인 필요만", clear: (s) => ({ ...s, check: false }) });
  if (f.star) chips.push({ key: "star", label: "즐겨찾기만", clear: (s) => ({ ...s, star: false }) });
  if (f.hr) {
    const hr = f.hr;
    chips.push({ key: "hr", label: `${hr[0]}–${hr[1]}시`, clear: (s) => ({ ...s, hr: null }) });
  }
  if (f.wd !== null) chips.push({ key: "wd", label: `${weekdayLabel(f.wd)}요일`, clear: (s) => ({ ...s, wd: null }) });
  if (f.df || f.dt) {
    const text = f.df && f.dt && f.df === f.dt ? dotDay(f.df) : `${f.df ? dotDay(f.df) : "처음"} ~ ${f.dt ? dotDay(f.dt) : "끝"}`;
    chips.push({ key: "date", label: text, clear: (s) => ({ ...s, df: "", dt: "" }) });
  }
  return chips;
}

export type ListParams = {
  filters: Filters;
  q: string;
  ex: string[];
};

export function parseListParams(params: URLSearchParams): ListParams {
  return {
    filters: parseFilters(params),
    q: (params.get("q") ?? "").slice(0, 80),
    ex: list(params.get("ex")),
  };
}

export function listToQuery(p: ListParams): string {
  const q = new URLSearchParams(filtersToQuery(p.filters));
  if (p.q.trim()) q.set("q", p.q.trim());
  if (p.q.trim() && p.ex.length) q.set("ex", p.ex.join(","));
  return q.toString();
}

export function runList(events: IssueEvent[], p: ListParams): { list: IssueEvent[]; search: SearchResult | null } {
  const text = p.q.trim();
  const search = text ? searchEvents(events, text, p.ex) : null;
  const base = search ? search.results : events;
  return { list: applyFilters(base, p.filters), search };
}

export function relaxOptions(events: IssueEvent[], p: ListParams): { label: string; count: number; next: ListParams }[] {
  const out: { label: string; count: number; next: ListParams }[] = [];
  describeFilters(p.filters).forEach((chip) => {
    const next = { ...p, filters: chip.clear(p.filters) };
    const count = runList(events, next).list.length;
    if (count > 0) out.push({ label: `‘${chip.label}’ 조건 빼기`, count, next });
  });
  const base = p.q.trim() ? searchEvents(events, p.q.trim(), p.ex) : null;
  base?.facets
    .filter((f) => !p.ex.includes(f.key))
    .forEach((f) => {
      const next = { ...p, ex: [...p.ex, f.key] };
      const count = runList(events, next).list.length;
      if (count > 0) out.push({ label: `‘${f.label}’ 조건 빼기`, count, next });
    });
  if (p.q.trim()) {
    const next = { ...p, q: "", ex: [] };
    const count = runList(events, next).list.length;
    if (count > 0) out.push({ label: "검색어 지우기", count, next });
  }
  return out.sort((a, b) => b.count - a.count).slice(0, 4);
}
