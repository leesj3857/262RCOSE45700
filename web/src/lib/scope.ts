import type { AreaId, DateRange } from "@/types/analytics";
import { addDays, daysIn } from "@/lib/dates";
import { DATA_END, DATA_START, PREV_WEEK, THIS_WEEK, WEEKS } from "@/mockData/events";

export type PeriodId = "thisWeek" | "lastWeek" | "4w" | "8w" | "custom";

export type Scope = {
  period: PeriodId;
  from: string;
  to: string;
  area: "all" | AreaId;
  vehicle: "all" | string;
};

export const DEFAULT_SCOPE: Scope = {
  period: "thisWeek",
  from: THIS_WEEK.start,
  to: THIS_WEEK.end,
  area: "all",
  vehicle: "all",
};

export const PERIODS: { id: PeriodId; label: string; hint: string }[] = [
  { id: "thisWeek", label: "이번 주", hint: "가장 최근 1주" },
  { id: "lastWeek", label: "지난 주", hint: "그 전 1주" },
  { id: "4w", label: "최근 4주", hint: "한 달 흐름" },
  { id: "8w", label: "최근 8주", hint: "전체 수집 기간" },
  { id: "custom", label: "선택 기간", hint: "시작일과 종료일 선택" },
];

function clamp(day: string): string {
  if (day < DATA_START) return DATA_START;
  if (day > DATA_END) return DATA_END;
  return day;
}

export function resolveRange(scope: Scope): DateRange {
  switch (scope.period) {
    case "thisWeek":
      return THIS_WEEK;
    case "lastWeek":
      return PREV_WEEK;
    case "4w":
      return { start: WEEKS[4].start, end: DATA_END };
    case "8w":
      return { start: DATA_START, end: DATA_END };
    default: {
      const a = clamp(scope.from);
      const b = clamp(scope.to);
      return a <= b ? { start: a, end: b } : { start: b, end: a };
    }
  }
}

export function baselineOf(range: DateRange): DateRange | null {
  const len = daysIn(range);
  const start = addDays(range.start, -len);
  if (start < DATA_START) return null;
  return { start, end: addDays(range.start, -1) };
}

export function periodLabel(scope: Scope): string {
  return PERIODS.find((p) => p.id === scope.period)?.label ?? "선택 기간";
}

export function isDefaultScope(scope: Scope): boolean {
  return scope.period === "thisWeek" && scope.area === "all" && scope.vehicle === "all";
}

export function baselineName(scope: Scope): string | null {
  switch (scope.period) {
    case "thisWeek":
      return "전주";
    case "lastWeek":
      return "전전주";
    case "4w":
      return "이전 4주";
    case "8w":
      return null;
    default:
      return "직전 같은 기간";
  }
}
