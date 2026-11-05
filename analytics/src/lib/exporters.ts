import type { DateRange, IssueEvent } from "@/types/analytics";
import { OPERATORS } from "@/mockData/taxonomy";
import { CAUSE_BY_ID, TYPE_BY_ID, ZONE_BY_ID, type Summary } from "./analytics";
import { dateTimeText, rangeText } from "./dates";
import { SEVERITY_LABEL, STATUS_LABEL } from "./filters";

function cell(value: string | number): string {
  const text = String(value).replaceAll('"', '""');
  return `"${text}"`;
}

export function eventsToCsv(events: IssueEvent[]): string {
  const header = ["ID", "발생 일시", "유형", "원인", "심각도", "상태", "위치", "차량", "오퍼레이터", "날씨", "최대 가속도(g)", "메모", "전사"];
  const rows = events.map((e) => [
    e.id,
    dateTimeText(e.occurredAt),
    TYPE_BY_ID[e.type].label,
    CAUSE_BY_ID[e.cause].label,
    SEVERITY_LABEL[e.severity],
    STATUS_LABEL[e.status],
    ZONE_BY_ID[e.zoneId].address,
    e.vehicleId,
    OPERATORS.find((o) => o.id === e.operatorId)?.name ?? "",
    e.weather || "미기록",
    e.peakG.toFixed(2),
    e.note,
    e.transcript,
  ]);
  return `﻿${[header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n")}`;
}

export function downloadText(filename: string, text: string, mime = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function summaryText(summary: Summary, range: DateRange, scopeLabel: string): string {
  const lines: string[] = [];
  lines.push(`[주행 이슈 요약] ${rangeText(range)} · ${scopeLabel}`);
  const delta = summary.deltaPct === null ? "" : ` (직전 기간 대비 ${summary.deltaPct > 0 ? "+" : ""}${summary.deltaPct}%)`;
  lines.push(`총 ${summary.total}건${delta}`);
  lines.push(`유형: ${summary.byType.filter((t) => t.count > 0).map((t) => `${t.label} ${t.count}건`).join(", ")}`);
  lines.push(`최다 원인: ${summary.byCause.slice(0, 3).map((c) => `${c.label} ${c.count}건`).join(", ")}`);
  lines.push(`심각도 높음 ${summary.bySeverity.high}건 · 확인 필요 ${summary.checkCount}건 · 미검토 ${summary.byStatus.new}건`);
  if (summary.patterns.length > 0) {
    lines.push(`반복 구간: ${summary.patterns.slice(0, 3).map((p) => `${ZONE_BY_ID[p.zoneId].name}(${CAUSE_BY_ID[p.cause].label} ${p.count}회)`).join(", ")}`);
  }
  return lines.join("\n");
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}
