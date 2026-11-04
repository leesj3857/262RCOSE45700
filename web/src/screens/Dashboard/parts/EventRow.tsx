import { CircleAlert, MapPin } from "lucide-react";
import type { IssueEvent } from "@/types/analytics";
import { needsCheck, ZONE_BY_ID } from "@/lib/analytics";
import { formatClock } from "@/lib/format";
import { TypeBadge } from "./TypeBadge";

export default function EventRow({ event }: { event: IssueEvent }) {
  const zone = ZONE_BY_ID[event.zoneId];
  return (
    <a
      href={`#/admin/events/${event.id}`}
      className="flex flex-col gap-2 rounded-[20px] border border-line bg-white p-4 transition-colors active:bg-surface"
    >
      <div className="flex items-center justify-between gap-2">
        <TypeBadge type={event.type} />
        <span className="num text-[13px] font-semibold text-ink-muted">{formatClock(event.occurredAt)}</span>
      </div>
      <p className="text-[16px] leading-snug font-bold">{event.title}</p>
      <div className="flex items-center justify-between gap-2 text-[13px] text-ink-muted">
        <span className="inline-flex min-w-0 items-center gap-1">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{zone.name}</span>
        </span>
        {needsCheck(event) && (
          <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-warning">
            <CircleAlert className="size-3.5" aria-hidden="true" />
            확인 필요
          </span>
        )}
      </div>
    </a>
  );
}
