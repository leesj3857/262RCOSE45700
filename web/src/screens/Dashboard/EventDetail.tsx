import { useState, type ReactNode } from "react";
import { Activity, ArrowRight, AudioLines, ChevronLeft, CircleAlert, FileText, ListChecks, MapPin } from "lucide-react";
import { ALL_EVENTS, EVENTS_THIS_WEEK } from "@/mockData/events";
import { CAUSE_BY_ID, ZONE_BY_ID } from "@/lib/analytics";
import { formatDateTime } from "@/lib/format";
import { eventsLink, navigate } from "@/lib/useHashRoute";
import type { FieldKey } from "@/types/analytics";
import PageHeader from "./parts/PageHeader";
import PlaybackBar from "./parts/PlaybackBar";
import { SeverityMark, TypeBadge } from "./parts/TypeBadge";
import VehicleLogChart from "./parts/VehicleLogChart";

function Section({ icon, title, note, children }: { icon: ReactNode; title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-panel border border-line bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-surface text-ink-sub">{icon}</span>
        <h2 className="text-[16px] font-extrabold">{title}</h2>
        {note && <span className="ml-auto text-[12px] font-medium text-ink-muted">{note}</span>}
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

export default function EventDetail({ id }: { id: string }) {
  const event = ALL_EVENTS.find((e) => e.id === id);
  const [selected, setSelected] = useState<FieldKey | null>(null);

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
  const selectedEvidence = event.fields.find((f) => f.key === selected)?.evidence ?? null;
  const sameCount =
    event.cause === "unknown" ? 0 : EVENTS_THIS_WEEK.filter((e) => e.zoneId === event.zoneId && e.cause === event.cause && e.id !== event.id).length;

  function back() {
    if (window.history.length > 1) window.history.back();
    else navigate("/admin/events");
  }

  return (
    <>
      <PageHeader
        title="이벤트 상세"
        left={
          <button
            type="button"
            onClick={back}
            aria-label="뒤로가기"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface active:bg-line"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
        }
      />

      <div className="flex flex-col gap-3 px-5 pb-8">
        <section className="rounded-panel bg-navy p-5 text-white">
          <div className="flex items-center gap-2">
            <TypeBadge type={event.type} />
            <span className="text-[12px] font-semibold text-white/70">{CAUSE_BY_ID[event.cause].label}</span>
          </div>
          <h2 className="mt-3 text-[22px] leading-snug font-extrabold tracking-tight">{event.title}</h2>
          <div className="mt-4 flex flex-col gap-1.5 text-[13px] text-white/70">
            <span className="num">{formatDateTime(event.occurredAt)}</span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 text-kakao" aria-hidden="true" />
              {zone.address}
            </span>
          </div>
          <div className="mt-4 rounded-full bg-white/10 px-3.5 py-2 [&_span]:text-white/85">
            <SeverityMark severity={event.severity} />
          </div>
        </section>

        <Section icon={<AudioLines className="size-4" aria-hidden="true" />} title="원본 음성" note="예시 음성">
          <PlaybackBar event={event} />
        </Section>

        <Section icon={<FileText className="size-4" aria-hidden="true" />} title="전사 (STT)">
          <p className="text-[16px] leading-[1.75]">
            <Highlighted text={event.transcript} mark={selectedEvidence} />
          </p>
        </Section>

        <Section
          icon={<ListChecks className="size-4" aria-hidden="true" />}
          title="구조화 결과"
          note={selected ? "근거 발화 표시 중" : "항목을 누르면 근거가 표시돼요"}
        >
          <ul className="flex flex-col gap-2">
            {event.fields.map((f) => {
              const active = selected === f.key;
              const empty = !f.value;
              return (
                <li key={f.key}>
                  <button
                    type="button"
                    onClick={() => setSelected(active ? null : f.key)}
                    disabled={empty}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-3 rounded-[16px] border px-4 py-3 text-left transition-colors ${
                      active ? "border-kakao bg-kakao-soft" : empty ? "border-dashed border-warning/50 bg-[#fff8ec]" : "border-line bg-white active:bg-surface"
                    }`}
                  >
                    <span className="w-10 shrink-0 text-[13px] font-semibold text-ink-muted">{f.label}</span>
                    {empty ? (
                      <span className="inline-flex items-center gap-1.5 text-[14px] font-bold text-warning">
                        <CircleAlert className="size-4" aria-hidden="true" />
                        확인 필요 · 근거 없어 비워 둠
                      </span>
                    ) : (
                      <span className="text-[15px] font-bold">{f.value}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section icon={<Activity className="size-4" aria-hidden="true" />} title="차량 로그" note="합성 로그 예시">
          <VehicleLogChart event={event} />
        </Section>

        {sameCount > 0 && (
          <a
            href={`#${eventsLink({ zone: event.zoneId, cause: event.cause })}`}
            className="flex items-center justify-between rounded-[20px] bg-kakao px-5 py-4 text-[15px] font-bold active:bg-kakao-press"
          >
            <span>
              같은 장소 · 같은 원인 <span className="num">{sameCount}</span>건 더 보기
            </span>
            <ArrowRight className="size-5" aria-hidden="true" />
          </a>
        )}
      </div>
    </>
  );
}
