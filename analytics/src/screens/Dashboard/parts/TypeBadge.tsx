import type { EventTypeId, Severity } from "@/types/analytics";
import { TYPE_BY_ID } from "@/lib/analytics";

const TONE: Record<EventTypeId, string> = {
  hardBrake: "bg-kakao-soft text-ink",
  hardAccel: "bg-blue-soft text-blue-ink",
  hardSteer: "bg-[#eef0f3] text-ink-sub",
  contact: "bg-[#fdeceb] text-danger",
  collision: "bg-danger text-white",
  other: "bg-surface text-ink-sub",
};

export function TypeBadge({ type }: { type: EventTypeId }) {
  return (
    <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-bold ${TONE[type]}`}>
      {TYPE_BY_ID[type].label}
    </span>
  );
}

const SEVERITY_LABEL: Record<Severity, string> = { low: "낮음", mid: "주의", high: "높음" };
const SEVERITY_DOT: Record<Severity, string> = { low: "bg-ink-muted/40", mid: "bg-warning", high: "bg-danger" };

export function SeverityMark({ severity }: { severity: Severity }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-sub">
      <span className={`size-2 rounded-full ${SEVERITY_DOT[severity]}`} aria-hidden="true" />
      심각도 {SEVERITY_LABEL[severity]}
    </span>
  );
}
