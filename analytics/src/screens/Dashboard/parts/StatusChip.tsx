import { CircleCheck, Flag, CircleDashed } from "lucide-react";
import type { Status } from "@/types/analytics";
import { STATUS_LABEL } from "@/lib/filters";

const TONE: Record<Status, string> = {
  new: "bg-surface text-ink-sub",
  reviewed: "bg-[#e6f6ed] text-[#0f7a42]",
  flagged: "bg-[#fff0e0] text-[#b25e00]",
};

const ICON = { new: CircleDashed, reviewed: CircleCheck, flagged: Flag } as const;

export default function StatusChip({ status, className = "" }: { status: Status; className?: string }) {
  const Icon = ICON[status];
  return (
    <span className={`inline-flex h-6 items-center gap-1 rounded-full px-2 text-[12px] font-bold ${TONE[status]} ${className}`}>
      <Icon className="size-3.5" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}
