import type { CauseId, DateRange, IssueEvent } from "@/types/analytics";
import { WEEKS } from "@/mockData/events";
import { CAUSE_BY_ID, hourMatrix, needsCheck, topWindow, zoneCauseSeries } from "./analytics";
import { eventsHref } from "./filters";
import { ZONE_BY_ID } from "./zones";

export type Priority = "high" | "mid" | "low";

export type Recommendation = {
  id: string;
  priority: Priority;
  kind: "hotspot" | "time" | "weather" | "review" | "check" | "severity" | "vehicle";
  title: string;
  reason: string;
  evidence: string[];
  action: string;
  ctas: { label: string; href: string }[];
  weight: number;
};

const ACTION_BY_CAUSE: Record<CauseId, string> = {
  twoWheeler: "이륜차·킥보드 진입이 잦은 구간이에요. 서행 구간 지정과 접근 전 경고 안내를 검토해 보세요.",
  pedestrian: "보행자 횡단이 잦은 구간이에요. 횡단 보행자 인지 구간으로 지정하고 감속 로직을 점검해 보세요.",
  vehicle: "합류·끼어들기가 잦은 구간이에요. 차선 정책과 차간 거리 설정을 점검해 보세요.",
  signal: "신호 전환 시 개입이 잦아요. 신호 주기와 진입 속도 프로파일을 점검해 보세요.",
  obstacle: "공사·불법 주정차 영향이 커요. 해당 정보를 경로 계획에 반영해 보세요.",
  weather: "노면 영향이 커요. 우천 시 제동 거리 가이드를 점검해 보세요.",
  unknown: "원인이 확인되지 않은 이벤트예요. 원본 음성을 확인해 원인을 입력해 주세요.",
};

const PRIORITY_RANK: Record<Priority, number> = { high: 3, mid: 2, low: 1 };

export function buildRecommendations(input: {
  events: IssueEvent[];
  scopedAll: IssueEvent[];
  range: DateRange;
}): Recommendation[] {
  const { events, scopedAll, range } = input;
  const recs: Recommendation[] = [];
  if (events.length === 0) return recs;

  const groups = new Map<string, number>();
  events.forEach((e) => {
    if (e.cause === "unknown") return;
    const key = `${e.zoneId}|${e.cause}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  });

  [...groups.entries()]
    .filter(([, count]) => count >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .forEach(([key, count]) => {
      const [zoneId, cause] = key.split("|") as [string, CauseId];
      const series = zoneCauseSeries(scopedAll, zoneId, cause);
      const found = WEEKS.findIndex((w) => range.end >= w.start && range.end <= w.end);
      const endIdx = found >= 0 ? found : WEEKS.length - 1;
      const recent = series.slice(Math.max(0, endIdx - 3), endIdx + 1);
      const rising = recent.length >= 3 && recent.every((v, i) => i === 0 || v >= recent[i - 1]) && recent[recent.length - 1] > recent[0];
      const zone = ZONE_BY_ID[zoneId];
      recs.push({
        id: `hotspot-${zoneId}-${cause}`,
        priority: rising && count >= 8 ? "high" : "mid",
        kind: "hotspot",
        title: rising ? `${zone.name} · ${CAUSE_BY_ID[cause].label} 증가 추세` : `${zone.name} · ${CAUSE_BY_ID[cause].label} 반복`,
        reason: rising
          ? `최근 ${recent.length}주 연속으로 늘고 있어요`
          : `선택한 기간에 같은 장소·같은 원인으로 ${count}건 반복됐어요`,
        evidence: [`주별 ${recent.join(" → ")}건`, `이번 기간 ${count}건`, zone.address],
        action: ACTION_BY_CAUSE[cause],
        ctas: [
          { label: "이벤트 보기", href: eventsHref({ zone: [zoneId], cause: [cause] }) },
          { label: "지도에서 보기", href: `/admin/map?zone=${zoneId}` },
        ],
        weight: count + (rising ? 6 : 0),
      });
    });

  const severe = events.filter((e) => e.severity === "high" && e.status !== "reviewed");
  if (severe.length > 0) {
    recs.push({
      id: "severity-pending",
      priority: "high",
      kind: "severity",
      title: `접촉·충돌 ${severe.length}건이 조치를 기다리고 있어요`,
      reason: "사고 이벤트는 다른 항목보다 먼저 원본 음성과 로그를 확인하는 것이 좋아요",
      evidence: [`미검토·조치 필요 ${severe.length}건`, `전체 사고 이벤트 ${events.filter((e) => e.severity === "high").length}건`],
      action: "상세 화면에서 음성·전사·차량 로그를 대조한 뒤 검토 상태를 바꿔 보세요.",
      ctas: [{ label: "바로 확인", href: eventsHref({ sev: ["high"], st: ["new", "flagged"], sort: "severity" }) }],
      weight: 100,
    });
  }

  const matrix = hourMatrix(events);
  const win = topWindow(matrix, 3);
  if (events.length >= 20 && win.share >= 0.28) {
    recs.push({
      id: `time-${win.from}`,
      priority: "mid",
      kind: "time",
      title: `${win.from}–${win.from + 3}시에 이벤트가 몰려요`,
      reason: `하루 중 3시간 동안 전체의 ${Math.round(win.share * 100)}%가 발생했어요`,
      evidence: [`${win.count}건 / 전체 ${events.length}건`, "운행 시간 8–22시 기준"],
      action: "해당 시간대의 오퍼레이터 배치와 속도 상한을 검토해 보세요.",
      ctas: [
        { label: "해당 시간대 보기", href: eventsHref({ hr: [win.from, win.from + 2] }) },
        { label: "시간대 분석", href: "/admin/analysis?s=time" },
      ],
      weight: Math.round(win.share * 100),
    });
  }

  const rain = events.filter((e) => e.weather === "비").length;
  const rainRatio = rain / events.length / 0.12;
  if (events.length >= 20 && rainRatio >= 1.4) {
    recs.push({
      id: "weather-rain",
      priority: "low",
      kind: "weather",
      title: "비 오는 날 이벤트 비율이 높아요",
      reason: `운행 시간 중 우천 비중(12%) 대비 ${rainRatio.toFixed(1)}배예요`,
      evidence: [`비 오는 날 ${rain}건 (${Math.round((rain / events.length) * 100)}%)`, "운행 시간 중 우천 비중은 예시 값"],
      action: "우천 시 운행 속도 가이드와 제동 거리 설정을 점검해 보세요.",
      ctas: [{ label: "비 오는 날 보기", href: eventsHref({ wx: ["비"] }) }],
      weight: Math.round(rainRatio * 10),
    });
  }

  const unreviewed = events.filter((e) => e.status === "new");
  if (unreviewed.length >= 8) {
    const oldest = [...unreviewed].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))[0];
    recs.push({
      id: "review-backlog",
      priority: unreviewed.length >= 30 ? "high" : "mid",
      kind: "review",
      title: `검토하지 않은 이벤트가 ${unreviewed.length}건 있어요`,
      reason: `가장 오래된 이벤트는 ${oldest.occurredAt.slice(5, 10).replace("-", ".")}에 기록됐어요`,
      evidence: [`미검토 ${unreviewed.length}건`, `검토 완료 ${events.filter((e) => e.status === "reviewed").length}건`],
      action: "오래된 순서로 하나씩 열어 검토 완료로 표시하면 반복 패턴 분석이 더 정확해져요.",
      ctas: [{ label: "오래된 순으로 검토", href: eventsHref({ st: ["new"], sort: "oldest" }) }],
      weight: unreviewed.length,
    });
  }

  const check = events.filter(needsCheck);
  if (check.length >= 5) {
    recs.push({
      id: "check-fields",
      priority: "mid",
      kind: "check",
      title: `비어 있는 항목이 있는 이벤트 ${check.length}건`,
      reason: "근거 발화가 없어 자동으로 채우지 않은 항목이에요",
      evidence: [`확인 필요 ${check.length}건`, `전체의 ${Math.round((check.length / events.length) * 100)}%`],
      action: "원본 음성을 다시 듣고 직접 입력하면 분류 정확도가 올라가요.",
      ctas: [{ label: "확인 필요한 것만 보기", href: eventsHref({ check: true, sort: "check" }) }],
      weight: check.length,
    });
  }

  return recs.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || b.weight - a.weight).slice(0, 8);
}

export const PRIORITY_LABEL: Record<Priority, string> = { high: "우선 조치", mid: "검토 권장", low: "참고" };
