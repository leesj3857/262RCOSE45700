import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  AudioLines,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FileText,
  Link2,
  ListChecks,
  MapPin,
  NotebookPen,
  Pencil,
  Star,
  Cpu,
} from "lucide-react";
import type { EventField, FieldKey, Status } from "@/types/analytics";
import { CAUSE_BY_ID, lowConfidence } from "@/lib/analytics";
import { dateTimeText } from "@/lib/dates";
import { copyText } from "@/lib/exporters";
import { eventsHref, parseListParams, runList, STATUS_LABEL } from "@/lib/filters";
import { navigate, type HashRoute } from "@/lib/useHashRoute";
import { ZONE_BY_ID } from "@/lib/zones";
import { OPERATORS, VEHICLES } from "@/mockData/taxonomy";
import { showToast } from "@/state/toast";
import { useAllEvents, useScopeData } from "@/state/useScopeData";
import { patchOverlay, restoreOverlay, setStatus, snapshotOverlay } from "@/state/userData";
import EventRow, { toggleStar } from "./parts/EventRow";
import FieldEditSheet from "./parts/FieldEditSheet";
import PageHeader from "./parts/PageHeader";
import PlaybackBar from "./parts/PlaybackBar";
import { SeverityMark, TypeBadge } from "./parts/TypeBadge";
import StatusChip from "./parts/StatusChip";
import VehicleLogChart from "./parts/VehicleLogChart";
import ZoneMap from "./parts/ZoneMap";

function Section({ icon, title, note, children }: { icon: ReactNode; title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-panel border border-line bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-[10px] bg-surface text-ink-sub">{icon}</span>
        <h2 className="text-[16px] font-extrabold">{title}</h2>
        {note && <span className="ml-auto text-right text-[12px] font-medium text-ink-muted">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function Highlighted({ text, mark }: { text: string; mark: string | null }) {
  const start = mark ? text.indexOf(mark) : -1;
  if (!mark || start < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded-[4px] bg-kakao-soft px-0.5 font-semibold text-ink shadow-[inset_0_-2px_0_#fee500]">{mark}</mark>
      {text.slice(start + mark.length)}
    </>
  );
}

function Confidence({ value }: { value: number | null }) {
  if (value === null) return null;
  const pct = Math.round(value * 100);
  const tone = pct >= 90 ? "bg-ok" : pct >= 80 ? "bg-kakao" : "bg-warning";
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-muted" title="자동 정리 신뢰도">
      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <span className={`block h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="num">{pct}%</span>
      <span className="sr-only">신뢰도</span>
    </span>
  );
}

const STATUS_OPTIONS: Status[] = ["new", "reviewed", "flagged"];

export default function EventDetail({ id, route }: { id: string; route: HashRoute }) {
  const all = useAllEvents();
  const { scope, events: scoped, scopedAll } = useScopeData();
  const event = all.find((e) => e.id === id);
  const ctx = route.params.get("ctx") ?? "";
  const [selected, setSelected] = useState<FieldKey | null>(null);
  const [editing, setEditing] = useState<FieldKey | null>(null);
  const [note, setNote] = useState(event?.note ?? "");
  const [procOpen, setProcOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    setNote(event?.note ?? "");
  }, [id, event?.note]);

  const scopeKey = JSON.stringify(scope);
  const siblingIds = useMemo(() => runList(scoped, parseListParams(new URLSearchParams(ctx))).list.map((e) => e.id), [ctx, scopeKey]);
  const index = siblingIds.indexOf(id);
  const byId = (i: number) => (i >= 0 && i < siblingIds.length ? (all.find((e) => e.id === siblingIds[i]) ?? null) : null);
  const prev = index > 0 ? byId(index - 1) : null;
  const next = index >= 0 ? byId(index + 1) : null;

  if (!event) {
    return (
      <>
        <PageHeader title="이벤트를 찾을 수 없어요" />
        <div className="px-5">
          <a href="#/admin/events" className="text-[14px] font-bold underline">
            목록으로 돌아가기
          </a>
        </div>
      </>
    );
  }

  const zone = ZONE_BY_ID[event.zoneId];
  const operator = OPERATORS.find((o) => o.id === event.operatorId);
  const selectedField = event.fields.find((f) => f.key === selected);
  const editingField: EventField | null = event.fields.find((f) => f.key === editing) ?? null;
  const related = scopedAll
    .filter((e) => e.id !== event.id && e.zoneId === event.zoneId && e.cause === event.cause && event.cause !== "unknown")
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const filledCount = event.fields.filter((f) => f.value).length;
  const proc = event.processing;
  const procTotal = proc.stt + proc.structure + proc.verify;

  const go = (to: string) => navigate(`/admin/events/${to}${ctx ? `?ctx=${encodeURIComponent(ctx)}` : ""}`, true);

  function back() {
    if (window.history.length > 1) window.history.back();
    else navigate(eventsHref());
  }

  function changeStatus(status: Status, goNext = false) {
    if (!event || (status === event.status && !goNext)) return;
    const snap = snapshotOverlay([event.id]);
    setStatus([event.id], status);
    showToast(`${STATUS_LABEL[status]}로 표시했어요`, { label: "되돌리기", run: () => restoreOverlay(snap) });
    if (goNext && next) go(next.id);
  }

  async function share() {
    const ok = await copyText(window.location.href);
    showToast(ok ? "이 이벤트 링크를 복사했어요" : "복사하지 못했어요");
  }

  function saveNote() {
    if (!event || note === event.note) return;
    patchOverlay(event.id, { note });
    showToast("메모를 저장했어요");
  }

  return (
    <>
      <PageHeader
        title="이벤트 상세"
        left={
          <button type="button" onClick={back} aria-label="목록으로 돌아가기" className="flex h-11 shrink-0 items-center gap-0.5 rounded-full bg-surface pr-4 pl-2.5 text-[14px] font-bold active:bg-line">
            <ChevronLeft className="size-5" aria-hidden="true" />
            목록
          </button>
        }
        right={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => toggleStar(event)}
              aria-pressed={event.starred}
              aria-label={event.starred ? "즐겨찾기 해제" : "즐겨찾기"}
              className="flex size-11 items-center justify-center rounded-full active:bg-surface"
            >
              <Star className={`size-5 ${event.starred ? "fill-kakao text-ink" : "text-ink-sub"}`} aria-hidden="true" />
            </button>
            <button type="button" onClick={share} aria-label="링크 복사" className="flex size-11 items-center justify-center rounded-full active:bg-surface">
              <Link2 className="size-5 text-ink-sub" aria-hidden="true" />
            </button>
          </div>
        }
      />

      {index >= 0 && (
        <div className="flex items-center justify-between gap-2 border-y border-line/70 px-5 py-2">
          <button
            type="button"
            disabled={!prev}
            onClick={() => prev && go(prev.id)}
            className="flex h-11 items-center gap-1 rounded-full px-3 text-[13px] font-bold text-ink-sub disabled:opacity-30 active:bg-surface"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            이전
          </button>
          <span className="num text-[13px] font-extrabold">
            {index + 1} <span className="font-medium text-ink-muted">/ {siblingIds.length}</span>
          </span>
          <button
            type="button"
            disabled={!next}
            onClick={() => next && go(next.id)}
            className="flex h-11 items-center gap-1 rounded-full px-3 text-[13px] font-bold text-ink-sub disabled:opacity-30 active:bg-surface"
          >
            다음
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 px-5 pt-4 pb-6">
        <section className="rounded-panel bg-navy p-5 text-white">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={event.type} />
            <span className="text-[12px] font-semibold text-white/70">{CAUSE_BY_ID[event.cause].label}</span>
            <span className="ml-auto">
              <StatusChip status={event.status} />
            </span>
          </div>
          <h2 className="mt-3 text-[22px] leading-snug font-extrabold tracking-tight">{event.title}</h2>
          <dl className="mt-4 flex flex-col gap-1.5 text-[13px] text-white/75">
            <div className="num">{dateTimeText(event.occurredAt)}</div>
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0 text-kakao" aria-hidden="true" />
              {zone.address}
            </div>
            <div>
              {VEHICLES.find((v) => v.id === event.vehicleId)?.name} · {operator?.name} 오퍼레이터
            </div>
          </dl>
          <div className="mt-4 inline-flex rounded-full bg-white/10 px-3.5 py-2 [&_span]:text-white/90">
            <SeverityMark severity={event.severity} />
          </div>
        </section>

        <section aria-label="검토 상태" className="rounded-panel border border-line bg-white p-4">
          <p className="mb-2 px-1 text-[13px] font-bold text-ink-muted">검토 상태</p>
          <div role="radiogroup" aria-label="검토 상태" className="grid grid-cols-3 gap-1.5 rounded-full bg-surface p-1">
            {STATUS_OPTIONS.map((s) => {
              const on = event.status === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => changeStatus(s)}
                  className={`h-11 rounded-full text-[14px] font-bold transition-colors ${on ? (s === "reviewed" ? "bg-ok text-white" : s === "flagged" ? "bg-warning text-white" : "bg-ink text-white") : "text-ink-sub"}`}
                >
                  {STATUS_LABEL[s]}
                </button>
              );
            })}
          </div>
        </section>

        <Section icon={<AudioLines className="size-4" aria-hidden="true" />} title="원본 음성" note="예시 음성">
          <PlaybackBar event={event} />
        </Section>

        <Section icon={<FileText className="size-4" aria-hidden="true" />} title="전사 (STT)" note={<span className="num">인식 신뢰도 {Math.round(event.sttConfidence * 100)}%</span>}>
          <p className="text-[16px] leading-[1.75]">
            <Highlighted text={event.transcript} mark={selectedField?.evidence ?? null} />
          </p>
          {selectedField?.evidence && <p className="mt-2 text-[12px] font-semibold text-ink-muted">‘{selectedField.label}’의 근거 발화를 표시하고 있어요</p>}
        </Section>

        <Section
          icon={<ListChecks className="size-4" aria-hidden="true" />}
          title="구조화 결과"
          note={<span className="num">{filledCount}/{event.fields.length} 채움</span>}
        >
          <ul className="flex flex-col gap-2">
            {event.fields.map((f) => {
              const active = selected === f.key;
              const empty = !f.value;
              return (
                <li key={f.key} className="relative">
                  <button
                    type="button"
                    onClick={() => setSelected(active ? null : f.key)}
                    disabled={empty && !f.evidence}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-3 rounded-[18px] border py-3 pr-14 pl-4 text-left transition-colors ${
                      active ? "border-kakao bg-kakao-soft" : empty ? "border-dashed border-warning/60 bg-[#fff8ec]" : "border-line bg-white active:bg-surface"
                    }`}
                  >
                    <span className="w-10 shrink-0 text-[13px] font-semibold text-ink-muted">{f.label}</span>
                    <span className="min-w-0 flex-1">
                      {empty ? (
                        <span className="inline-flex items-center gap-1.5 text-[14px] font-bold text-warning">
                          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                          확인 필요 · 비어 있어요
                        </span>
                      ) : (
                        <span className="block text-[15px] leading-snug font-bold">{f.value}</span>
                      )}
                      <span className="mt-1 flex items-center gap-2">
                        {f.edited ? (
                          <span className="inline-flex h-5 items-center gap-0.5 rounded-full bg-ink px-2 text-[11px] font-bold text-white">
                            <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                            직접 수정
                          </span>
                        ) : (
                          <Confidence value={f.confidence} />
                        )}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(f.key)}
                    aria-label={`${f.label} 수정`}
                    className="absolute top-1/2 right-1.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-ink-sub active:bg-surface"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
          {lowConfidence(event) && (
            <p className="mt-3 flex items-start gap-2 rounded-[14px] bg-[#fff8ec] p-3 text-[13px] leading-relaxed text-ink-sub">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              신뢰도가 낮은 항목이 있어요. 원본 음성을 들어보고 필요하면 수정해 주세요.
            </p>
          )}
        </Section>

        <section aria-label="자동 처리 내역" className="rounded-panel border border-line bg-white">
          <button
            type="button"
            onClick={() => setProcOpen((v) => !v)}
            aria-expanded={procOpen}
            className="flex w-full items-center gap-2 p-5 text-left"
          >
            <span className="flex size-8 items-center justify-center rounded-[10px] bg-surface text-ink-sub">
              <Cpu className="size-4" aria-hidden="true" />
            </span>
            <h2 className="text-[16px] font-extrabold">자동 처리 내역</h2>
            <span className="num ml-auto text-[12px] font-medium text-ink-muted">{(procTotal / 1000).toFixed(1)}초</span>
            <ChevronDown className={`size-4 text-ink-muted transition-transform ${procOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {procOpen && (
            <div className="px-5 pb-5">
              <div className="flex h-3 overflow-hidden rounded-full bg-surface" role="img" aria-label="단계별 처리 시간">
                <span className="bg-ink" style={{ width: `${(proc.stt / procTotal) * 100}%` }} />
                <span className="bg-kakao" style={{ width: `${(proc.structure / procTotal) * 100}%` }} />
                <span className="bg-ok" style={{ width: `${(proc.verify / procTotal) * 100}%` }} />
              </div>
              <ul className="mt-3 flex flex-col gap-2 text-[13px]">
                <li className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-ink" aria-hidden="true" />
                  음성 → 텍스트
                  <span className="num ml-auto font-bold">{(proc.stt / 1000).toFixed(1)}초</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-kakao" aria-hidden="true" />
                  텍스트 → 구조화
                  <span className="num ml-auto font-bold">{(proc.structure / 1000).toFixed(1)}초</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-ok" aria-hidden="true" />
                  근거 검증
                  <span className="num ml-auto font-bold">{(proc.verify / 1000).toFixed(2)}초</span>
                </li>
              </ul>
              <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
                모든 항목은 근거 발화가 확인될 때만 채워요. 근거가 없으면 추측해서 채우지 않고 비워 둬요.
              </p>
            </div>
          )}
        </section>

        <section aria-label="차량 로그" className="rounded-panel border border-line bg-white">
          <button type="button" onClick={() => setLogOpen((v) => !v)} aria-expanded={logOpen} className="flex w-full items-center gap-2 p-5 text-left">
            <span className="flex size-8 items-center justify-center rounded-[10px] bg-surface text-ink-sub">
              <Activity className="size-4" aria-hidden="true" />
            </span>
            <h2 className="text-[16px] font-extrabold">차량 로그</h2>
            <span className="num ml-auto text-[12px] font-medium text-ink-muted">
              최대 {event.peakG > 0 ? "+" : ""}
              {event.peakG.toFixed(2)}g
            </span>
            <ChevronDown className={`size-4 text-ink-muted transition-transform ${logOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {logOpen && (
            <div className="px-5 pb-5">
              <VehicleLogChart event={event} />
              <p className="mt-2 text-[12px] text-ink-muted">합성 로그 예시예요. 실제 차량 로그 연동은 이후 단계예요.</p>
            </div>
          )}
        </section>

        <Section
          icon={<MapPin className="size-4" aria-hidden="true" />}
          title="발생 위치"
          note={
            <a href={`#/admin/map?zone=${zone.id}&event=${event.id}`} className="inline-flex items-center gap-0.5 font-bold text-ink-sub">
              지도에서 크게 보기
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </a>
          }
        >
          <ZoneMap
            area={zone.area}
            events={[event, ...related.slice(0, 14)]}
            mode="events"
            selectedZone={zone.id}
            onSelectZone={() => undefined}
            selectedEvent={event.id}
            focusZone={zone.id}
            compact
          />
        </Section>

        <Section icon={<NotebookPen className="size-4" aria-hidden="true" />} title="메모" note="이 이벤트에만 보여요">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={saveNote}
            rows={3}
            maxLength={300}
            placeholder="확인한 내용이나 후속 조치를 적어 두세요"
            className="w-full resize-none rounded-[16px] border border-line bg-white p-3.5 text-[15px] leading-relaxed outline-none placeholder:text-ink-muted focus:border-ink"
          />
          <p className="num mt-1.5 text-right text-[12px] text-ink-muted">{note.length}/300</p>
        </Section>

        {related.length > 0 && (
          <section aria-label="비슷한 이벤트" className="flex flex-col gap-2.5">
            <div className="flex items-end justify-between px-1">
              <h2 className="text-[16px] font-extrabold">같은 장소 · 같은 원인</h2>
              <a href={`#${eventsHref({ zone: [event.zoneId], cause: [event.cause] })}`} className="inline-flex h-9 items-center gap-0.5 text-[13px] font-bold text-ink-sub">
                <span className="num">{related.length}</span>건 모두 보기
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </a>
            </div>
            {related.slice(0, 3).map((e) => (
              <EventRow key={e.id} event={e} showDate />
            ))}
          </section>
        )}
      </div>

      <div className="sticky bottom-0 z-20 border-t border-line bg-white/95 px-5 py-3 backdrop-blur">
        {event.status === "reviewed" ? (
          next ? (
            <button type="button" onClick={() => go(next.id)} className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-extrabold text-white active:scale-[0.99]">
              다음 이벤트 보기
              <ArrowRight className="size-4 text-kakao" strokeWidth={2.8} aria-hidden="true" />
            </button>
          ) : (
            <p className="flex h-13 items-center justify-center gap-2 rounded-full bg-[#e6f6ed] text-[14px] font-bold text-[#0f7a42]">
              <Check className="size-4" strokeWidth={3} aria-hidden="true" />
              검토를 마쳤어요
            </p>
          )
        ) : (
          <button
            type="button"
            onClick={() => changeStatus("reviewed", true)}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-kakao text-[15px] font-extrabold active:bg-kakao-press"
          >
            <Check className="size-5" strokeWidth={3} aria-hidden="true" />
            {next ? "검토 완료하고 다음으로" : "검토 완료"}
          </button>
        )}
      </div>

      {editingField && <FieldEditSheet key={editingField.key} event={event} field={editingField} onClose={() => setEditing(null)} />}
    </>
  );
}
