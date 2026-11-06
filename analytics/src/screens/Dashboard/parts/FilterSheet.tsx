import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { Filters } from "@/lib/filters";
import { EMPTY_FILTERS, SEVERITY_LABEL, STATUS_LABEL } from "@/lib/filters";
import { weekdayLabel } from "@/lib/dates";
import { AREAS, CAUSES, EVENT_TYPES, HOUR_WINDOWS, ZONES } from "@/mockData/taxonomy";
import { useScopeData } from "@/state/useScopeData";
import Chip from "./Chip";
import Sheet from "./Sheet";

type Props = {
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
      <h3 className="mb-2 text-[13px] font-bold text-ink-sub">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function Fold({ title, active, children }: { title: string; active: number; children: ReactNode }) {
  const [open, setOpen] = useState(active > 0);
  return (
    <section aria-label={title} className="border-t border-line">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex h-14 w-full items-center gap-2 text-left">
        <span className="text-[15px] font-extrabold">{title}</span>
        {active > 0 && <span className="num flex size-5 items-center justify-center rounded-full bg-kakao text-[12px] font-extrabold">{active}</span>}
        <ChevronDown className={`ml-auto size-5 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && <div className="flex flex-col gap-4 pb-4">{children}</div>}
    </section>
  );
}

function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[12px] font-bold text-ink-muted">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
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

const ZONE_SHOWN = 6;

function ZonePicker({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  const { scopedAll } = useScopeData();
  const [query, setQuery] = useState("");
  const q = query.trim();

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    scopedAll.forEach((e) => m.set(e.zoneId, (m.get(e.zoneId) ?? 0) + 1));
    return m;
  }, [scopedAll]);

  const ranked = useMemo(() => [...ZONES].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0)), [counts]);
  const areaName = (id: string) => AREAS.find((a) => a.id === id)?.label ?? "";

  const shown = q
    ? ranked.filter((z) => `${z.name} ${z.address} ${areaName(z.area)}`.includes(q))
    : [...ranked.filter((z) => selected.includes(z.id)), ...ranked.filter((z) => !selected.includes(z.id))].slice(0, Math.max(ZONE_SHOWN, selected.length));

  return (
    <div className="flex flex-col gap-3">
      <label className="flex h-11 items-center gap-2 rounded-full bg-surface px-4">
        <Search className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="구간이나 동네 이름으로 찾기"
          aria-label="구간 검색"
          className="min-w-0 flex-1 bg-transparent text-[14px] placeholder:text-ink-muted"
        />
      </label>
      {!q && <p className="text-[12px] font-bold text-ink-muted">이벤트가 많은 구간</p>}
      <div className="flex flex-wrap gap-2">
        {shown.map((z) => (
          <Chip key={z.id} active={selected.includes(z.id)} onClick={() => onToggle(z.id)} count={counts.get(z.id) ?? 0}>
            {q ? `${areaName(z.area)} ${z.name}` : z.name}
          </Chip>
        ))}
        {shown.length === 0 && <p className="text-[13px] text-ink-muted">맞는 구간이 없어요</p>}
      </div>
    </div>
  );
}

export default function FilterSheet({ onClose, filters, onApply, count }: Props) {
  const [draft, setDraft] = useState<Filters>(filters);
  const set = (p: Partial<Filters>) => setDraft((d) => ({ ...d, ...p }));
  const n = count(draft);

  return (
    <Sheet
      open
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
            disabled={n === 0}
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="h-12 flex-1 rounded-full bg-kakao text-[15px] font-extrabold text-ink active:bg-kakao-press disabled:bg-line disabled:text-ink-muted"
          >
            {n === 0 ? "맞는 이벤트가 없어요" : (
              <>
                <span className="num">{n}</span>건 보기
              </>
            )}
          </button>
        </div>
      }
    >
      <Group title="어떤 사건인가요?">
        {EVENT_TYPES.map((t) => (
          <Chip key={t.id} active={draft.type.includes(t.id)} onClick={() => set({ type: toggle(draft.type, t.id) })}>
            {t.label}
          </Chip>
        ))}
      </Group>
      <Group title="왜 생겼나요?">
        {CAUSES.map((c) => (
          <Chip key={c.id} active={draft.cause.includes(c.id)} onClick={() => set({ cause: toggle(draft.cause, c.id) })}>
            {c.label}
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
      <Group title="심각도">
        {(["high", "mid", "low"] as const).map((s) => (
          <Chip key={s} active={draft.sev.includes(s)} onClick={() => set({ sev: toggle(draft.sev, s) })}>
            {SEVERITY_LABEL[s]}
          </Chip>
        ))}
      </Group>

      <div className="mt-5">
        <Fold title="언제" active={(draft.hr ? 1 : 0) + (draft.wd !== null ? 1 : 0)}>
          <Sub title="시간대">
            {HOUR_WINDOWS.map((w) => {
              const on = draft.hr?.[0] === w.from && draft.hr?.[1] === w.to;
              return (
                <Chip key={w.id} active={on} onClick={() => set({ hr: on ? null : [w.from, w.to] })}>
                  {w.label}
                </Chip>
              );
            })}
          </Sub>
          <Sub title="요일">
            {Array.from({ length: 7 }, (_, i) => (
              <Chip key={i} active={draft.wd === i} onClick={() => set({ wd: draft.wd === i ? null : i })}>
                {weekdayLabel(i)}
              </Chip>
            ))}
          </Sub>
        </Fold>
        <Fold title="어디서" active={draft.zone.length}>
          <ZonePicker selected={draft.zone} onToggle={(id) => set({ zone: toggle(draft.zone, id) })} />
        </Fold>
        <Fold title="날씨" active={draft.wx.length}>
          <div className="flex flex-wrap gap-2">
            {["맑음", "흐림", "비", "미기록"].map((w) => (
              <Chip key={w} active={draft.wx.includes(w)} onClick={() => set({ wx: toggle(draft.wx, w) })}>
                {w}
              </Chip>
            ))}
          </div>
        </Fold>
        <Fold title="내가 표시한 것" active={(draft.check ? 1 : 0) + (draft.star ? 1 : 0)}>
          <Switch label="확인 필요한 항목만" hint="빈 항목이 있어요" on={draft.check} onChange={(check) => set({ check })} />
          <Switch label="즐겨찾기만" hint="별표 표시한 이벤트" on={draft.star} onChange={(star) => set({ star })} />
        </Fold>
      </div>
    </Sheet>
  );
}
