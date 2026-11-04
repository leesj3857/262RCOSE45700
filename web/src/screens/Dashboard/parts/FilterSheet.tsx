import { useState, type ReactNode } from "react";
import type { Filters } from "@/lib/filters";
import { EMPTY_FILTERS, SEVERITY_LABEL, STATUS_LABEL } from "@/lib/filters";
import { weekdayLabel } from "@/lib/dates";
import { AREAS, CAUSES, EVENT_TYPES, HOUR_WINDOWS, VEHICLES, ZONES } from "@/mockData/taxonomy";
import Chip from "./Chip";
import Sheet from "./Sheet";

type Props = {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onApply: (f: Filters) => void;
  count: (f: Filters) => number;
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="mt-5 first:mt-1">
      <h3 className="mb-2 text-[13px] font-bold text-ink-muted">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function Switch({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-4 rounded-[18px] bg-surface px-4 py-3 text-left active:bg-line"
    >
      <span>
        <span className="block text-[15px] font-bold">{label}</span>
        <span className="block text-[12px] text-ink-muted">{hint}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-ink" : "bg-line"}`} aria-hidden="true">
        <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

export default function FilterSheet({ open, onClose, filters, onApply, count }: Props) {
  const [draft, setDraft] = useState<Filters>(filters);
  const set = (p: Partial<Filters>) => setDraft((d) => ({ ...d, ...p }));
  const n = count(draft);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="필터"
      footer={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDraft({ ...EMPTY_FILTERS, sort: draft.sort })}
            className="h-12 shrink-0 rounded-full px-4 text-[14px] font-bold text-ink-sub active:bg-surface"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="h-12 flex-1 rounded-full bg-kakao text-[15px] font-extrabold text-ink active:bg-kakao-press"
          >
            <span className="num">{n}</span>건 보기
          </button>
        </div>
      }
    >
      <Group title="유형">
        {EVENT_TYPES.map((t) => (
          <Chip key={t.id} active={draft.type.includes(t.id)} onClick={() => set({ type: toggle(draft.type, t.id) })}>
            {t.label}
          </Chip>
        ))}
      </Group>
      <Group title="원인">
        {CAUSES.map((c) => (
          <Chip key={c.id} active={draft.cause.includes(c.id)} onClick={() => set({ cause: toggle(draft.cause, c.id) })}>
            {c.label}
          </Chip>
        ))}
      </Group>
      <Group title="심각도">
        {(["high", "mid", "low"] as const).map((s) => (
          <Chip key={s} active={draft.sev.includes(s)} onClick={() => set({ sev: toggle(draft.sev, s) })}>
            {SEVERITY_LABEL[s]}
          </Chip>
        ))}
      </Group>
      <Group title="검토 상태">
        {(["new", "flagged", "reviewed"] as const).map((s) => (
          <Chip key={s} active={draft.st.includes(s)} onClick={() => set({ st: toggle(draft.st, s) })}>
            {STATUS_LABEL[s]}
          </Chip>
        ))}
      </Group>
      <Group title="날씨">
        {["맑음", "흐림", "비", "미기록"].map((w) => (
          <Chip key={w} active={draft.wx.includes(w)} onClick={() => set({ wx: toggle(draft.wx, w) })}>
            {w}
          </Chip>
        ))}
      </Group>
      <Group title="시간대">
        {HOUR_WINDOWS.map((w) => {
          const on = draft.hr?.[0] === w.from && draft.hr?.[1] === w.to;
          return (
            <Chip key={w.id} active={on} onClick={() => set({ hr: on ? null : [w.from, w.to] })}>
              {w.label}
            </Chip>
          );
        })}
      </Group>
      <Group title="요일">
        {Array.from({ length: 7 }, (_, i) => (
          <Chip key={i} active={draft.wd === i} onClick={() => set({ wd: draft.wd === i ? null : i })}>
            {weekdayLabel(i)}
          </Chip>
        ))}
      </Group>
      {AREAS.map((a) => (
        <Group key={a.id} title={`장소 · ${a.label}`}>
          {ZONES.filter((z) => z.area === a.id).map((z) => (
            <Chip key={z.id} active={draft.zone.includes(z.id)} onClick={() => set({ zone: toggle(draft.zone, z.id) })}>
              {z.name}
            </Chip>
          ))}
        </Group>
      ))}
      <Group title="차량">
        {VEHICLES.map((v) => (
          <Chip key={v.id} active={draft.veh.includes(v.id)} onClick={() => set({ veh: toggle(draft.veh, v.id) })}>
            {v.id}
          </Chip>
        ))}
      </Group>
      <div className="mt-5 flex flex-col gap-2">
        <Switch label="확인 필요한 항목만" hint="비어 있는 필드가 있는 이벤트" on={draft.check} onChange={(check) => set({ check })} />
        <Switch label="즐겨찾기만" hint="별표를 표시한 이벤트" on={draft.star} onChange={(star) => set({ star })} />
      </div>
    </Sheet>
  );
}
