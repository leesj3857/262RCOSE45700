import { useState } from "react";
import { Quote, Undo2 } from "lucide-react";
import type { EventField, FieldKey, IssueEvent } from "@/types/analytics";
import { CAUSES, EVENT_TYPES } from "@/mockData/taxonomy";
import { overlayStore, patchOverlay } from "@/state/userData";
import { showToast } from "@/state/toast";
import Chip from "./Chip";
import Sheet from "./Sheet";

const OPTIONS: Partial<Record<FieldKey, string[]>> = {
  event: EVENT_TYPES.map((t) => t.label),
  cause: CAUSES.filter((c) => c.id !== "unknown").map((c) => c.label),
  weather: ["맑음", "흐림", "비"],
};

type Props = {
  event: IssueEvent;
  field: EventField | null;
  onClose: () => void;
};

export default function FieldEditSheet({ event, field, onClose }: Props) {
  const [value, setValue] = useState(field?.value ?? "");
  if (!field) return null;
  const options = OPTIONS[field.key];

  function save() {
    if (!field) return;
    const current = overlayStore.get()[event.id]?.edits ?? {};
    patchOverlay(event.id, { edits: { ...current, [field.key]: value.trim() } });
    showToast(`${field.label} 항목을 수정했어요`);
    onClose();
  }

  function revert() {
    if (!field) return;
    const { [field.key]: _removed, ...rest } = overlayStore.get()[event.id]?.edits ?? {};
    void _removed;
    patchOverlay(event.id, { edits: rest });
    showToast("원래 값으로 되돌렸어요");
    onClose();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={`${field.label} 수정`}
      footer={
        <div className="flex items-center gap-3">
          {field.edited && (
            <button type="button" onClick={revert} className="flex h-12 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-bold text-ink-sub active:bg-surface">
              <Undo2 className="size-4" aria-hidden="true" />
              원래대로
            </button>
          )}
          <button type="button" onClick={save} disabled={!value.trim()} className="h-12 flex-1 rounded-full bg-kakao text-[15px] font-extrabold disabled:opacity-40 active:bg-kakao-press">
            저장
          </button>
        </div>
      }
    >
      {field.evidence ? (
        <p className="mt-1 flex gap-2 rounded-[16px] bg-kakao-soft p-3 text-[14px] leading-relaxed">
          <Quote className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <span className="block text-[12px] font-bold text-ink/60">근거 발화</span>
            {field.evidence}
          </span>
        </p>
      ) : (
        <p className="mt-1 rounded-[16px] bg-[#fff8ec] p-3 text-[13px] leading-relaxed text-ink-sub">
          말하지 않은 항목이라 자동으로 채우지 않았어요. 원본 음성을 확인한 뒤 직접 입력해 주세요.
        </p>
      )}

      {options ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {options.map((o) => (
            <Chip key={o} active={value === o} tone="kakao" onClick={() => setValue(o)}>
              {o}
            </Chip>
          ))}
        </div>
      ) : (
        <label className="mt-4 flex flex-col gap-1.5 text-[13px] font-bold text-ink-muted">
          {field.label}
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-12 rounded-[14px] border border-line px-4 text-[16px] font-semibold text-ink outline-none focus:border-ink"
          />
        </label>
      )}
    </Sheet>
  );
}
