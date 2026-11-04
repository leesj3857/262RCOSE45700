import { Check, CircleAlert, MapPin, Star, TriangleAlert } from "lucide-react";
import type { IssueEvent } from "@/types/analytics";
import { lowConfidence, needsCheck } from "@/lib/analytics";
import { clockOf } from "@/lib/dates";
import { ZONE_BY_ID } from "@/lib/zones";
import { patchOverlay } from "@/state/userData";
import { showToast } from "@/state/toast";
import StatusChip from "./StatusChip";
import { TypeBadge } from "./TypeBadge";

type Props = {
  event: IssueEvent;
  ctx?: string;
  selectMode?: boolean;
  selected?: boolean;
  onToggle?: (id: string) => void;
  showDate?: boolean;
};

export function toggleStar(event: IssueEvent) {
  const next = !event.starred;
  patchOverlay(event.id, { starred: next });
  showToast(next ? "즐겨찾기에 추가했어요" : "즐겨찾기에서 뺐어요");
}

export default function EventRow({ event, ctx, selectMode = false, selected = false, onToggle, showDate = false }: Props) {
  const zone = ZONE_BY_ID[event.zoneId];
  const check = needsCheck(event);
  const lowConf = !check && lowConfidence(event);
  const href = `#/admin/events/${event.id}${ctx ? `?ctx=${encodeURIComponent(ctx)}` : ""}`;

  const body = (
    <>
      <div className="flex items-center gap-1.5 pr-12">
        {event.status === "new" && (
          <span className="flex size-2.5 shrink-0 rounded-full bg-ink" role="img" aria-label="미검토" />
        )}
        <TypeBadge type={event.type} />
        {event.status === "flagged" && <StatusChip status={event.status} />}
        {event.severity === "high" && (
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-danger/10 px-2 text-[12px] font-bold text-danger">
            <TriangleAlert className="size-3.5" aria-hidden="true" />
            사고
          </span>
        )}
      </div>
      <p className="text-[16px] leading-snug font-bold">{event.title}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted">
        <span className="inline-flex min-w-0 items-center gap-1">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{zone.name}</span>
        </span>
        <span className="num">
          {showDate && `${event.occurredAt.slice(5, 10).replace("-", ".")} `}
          {clockOf(event.occurredAt)}
        </span>
        <span className="num">{event.vehicleId}</span>
        {check && (
          <span className="inline-flex items-center gap-1 font-bold text-warning">
            <CircleAlert className="size-3.5" aria-hidden="true" />
            확인 필요
          </span>
        )}
        {lowConf && <span className="font-bold text-warning">신뢰도 낮음</span>}
      </div>
    </>
  );

  const base = `flex w-full flex-col gap-2 rounded-[20px] border bg-white p-4 text-left transition-colors ${
    selected ? "border-ink bg-kakao-soft" : "border-line active:bg-surface"
  }`;

  if (selectMode) {
    return (
      <button type="button" role="checkbox" aria-checked={selected} onClick={() => onToggle?.(event.id)} className={`${base} relative`}>
        <span
          aria-hidden="true"
          className={`absolute top-4 right-4 flex size-6 items-center justify-center rounded-full border-2 ${
            selected ? "border-ink bg-ink text-white" : "border-line bg-white"
          }`}
        >
          {selected && <Check className="size-3.5" strokeWidth={3} />}
        </span>
        {body}
      </button>
    );
  }

  return (
    <div className="relative">
      <a href={href} className={base}>
        {body}
      </a>
      <button
        type="button"
        onClick={() => toggleStar(event)}
        aria-pressed={event.starred}
        aria-label={event.starred ? "즐겨찾기 해제" : "즐겨찾기"}
        className="absolute top-1.5 right-1.5 flex size-11 items-center justify-center rounded-full active:bg-surface"
      >
        <Star className={`size-5 ${event.starred ? "fill-kakao text-ink" : "text-ink-muted"}`} strokeWidth={event.starred ? 2.2 : 1.8} aria-hidden="true" />
      </button>
    </div>
  );
}
