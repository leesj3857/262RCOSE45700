const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function parts(iso: string) {
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return {
    y: kst.getUTCFullYear(),
    m: kst.getUTCMonth() + 1,
    d: kst.getUTCDate(),
    h: kst.getUTCHours(),
    min: kst.getUTCMinutes(),
    wd: kst.getUTCDay(),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatClock(iso: string): string {
  const p = parts(iso);
  return `${pad(p.h)}:${pad(p.min)}`;
}

export function formatDayKey(iso: string): string {
  const p = parts(iso);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

export function formatDayLabel(iso: string): string {
  const p = parts(iso);
  return `${p.m}월 ${p.d}일 (${WEEKDAYS[p.wd]})`;
}

export function formatDateTime(iso: string): string {
  const p = parts(iso);
  return `${p.y}.${pad(p.m)}.${pad(p.d)} ${pad(p.h)}:${pad(p.min)}`;
}

export function formatRange(start: string, end: string): string {
  const [y1, m1, d1] = start.split("-");
  const [y2, m2, d2] = end.split("-");
  return `${y1}.${m1}.${d1} ~ ${y2 === y1 ? "" : `${y2}.`}${m2}.${d2}`;
}

export function weekdayOf(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}
