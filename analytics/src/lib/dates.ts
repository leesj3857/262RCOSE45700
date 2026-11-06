import type { DateRange } from "@/types/analytics";

const KST_OFFSET = 9 * 60 * 60 * 1000;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function kst(iso: string) {
  return new Date(new Date(iso).getTime() + KST_OFFSET);
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export function dayOf(iso: string): string {
  return kst(iso).toISOString().slice(0, 10);
}

export function hourOf(iso: string): number {
  return kst(iso).getUTCHours();
}

export function weekdayIndex(iso: string): number {
  return (kst(iso).getUTCDay() + 6) % 7;
}

export function weekdayLabel(index: number): string {
  return WEEKDAYS[(index + 1) % 7];
}

export function weekdayOfDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function inRange(iso: string, range: DateRange): boolean {
  const k = dayOf(iso);
  return k >= range.start && k <= range.end;
}

export function daysIn(range: DateRange): number {
  return diffDays(range.start, range.end) + 1;
}

export function shortDay(day: string): string {
  const [, m, d] = day.split("-");
  return `${Number(m)}.${Number(d)}`;
}

export function dotDay(day: string): string {
  return day.replaceAll("-", ".");
}

export function rangeText(range: DateRange): string {
  const [y1, m1, d1] = range.start.split("-");
  const [y2, m2, d2] = range.end.split("-");
  if (range.start === range.end) return `${y1}.${m1}.${d1}`;
  return `${y1}.${m1}.${d1} ~ ${y2 === y1 ? "" : `${y2}.`}${m2}.${d2}`;
}

export function shortRangeText(range: DateRange): string {
  const [, m1, d1] = range.start.split("-");
  const [, m2, d2] = range.end.split("-");
  if (range.start === range.end) return `${m1}.${d1}`;
  return `${m1}.${d1} ~ ${m2}.${d2}`;
}

export function clockOf(iso: string): string {
  const d = kst(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function dayHeading(day: string): string {
  const [, m, d] = day.split("-");
  return `${Number(m)}월 ${Number(d)}일 (${weekdayOfDay(day)})`;
}

export function dateTimeText(iso: string): string {
  return `${dotDay(dayOf(iso))} ${clockOf(iso)}`;
}
