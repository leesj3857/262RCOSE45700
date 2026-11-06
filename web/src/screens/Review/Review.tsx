import { useState, type ReactNode } from "react";
import { AudioLines, FileText, ListChecks, Plus } from "lucide-react";
import Button from "@/components/Button";
import { mockReview } from "@/mockData/reviewData";
import type { AudioClip, ReviewData } from "@/types/report";
import ClipPlayer from "./ClipPlayer";
import Transcript from "./Transcript";

// 필드 키를 화면용 한글 이름으로 바꾸는 사전
const FIELD_LABELS: Record<string, string> = {
  location: "위치",
  event: "사건",
  situation: "상황",
  weather: "날씨",
};

type Props = {
  audioClips: AudioClip[];
  onAdd: () => void;
  onSave: () => void;
  onBack: () => void;
};

function Section({
  icon,
  title,
  note,
  badge,
  children,
}: {
  icon: ReactNode;
  title: string;
  /** 제목 바로 옆에 붙는 짧은 상태 문구 */
  note?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bg-white px-5 py-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-surface text-ink-sub">{icon}</span>
        <h2 className="text-[16px] font-extrabold">{title}</h2>
        {note}
        {badge && <span className="ml-auto">{badge}</span>}
      </div>
      {children}
    </section>
  );
}

/** 서버 연결 전 가짜 데이터임을 표시 */
function MockBadge() {
  return (
    <span className="text-[12px] font-medium text-ink-muted">예시 데이터</span>
  );
}

export default function Review({ audioClips, onAdd, onBack, onSave }: Props) {
  const [review] = useState<ReviewData>(mockReview);

  const fields = Object.entries(review.fields);
  const needCheckCount = fields.filter(([, f]) => !f.value).length;
  const evidences = fields.map(([, f]) => f.evidence).filter((e): e is string => Boolean(e));

  return (
    <main className="app-frame mx-auto flex h-dvh w-full max-w-[430px] flex-col bg-surface">
      <header className="shrink-0 bg-white px-5 pt-6 pb-5">
        <h1 className="text-[22px] font-extrabold tracking-tight">기록 확인</h1>
        <p className="mt-1 text-[14px] text-ink-muted">자동으로 정리된 내용이 맞는지 확인해 주세요</p>
      </header>

      {/* 스크롤되는 영역 */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pt-2">
        {/* 1. 녹음 내용 재생 */}
        <Section
          icon={<AudioLines className="size-4" aria-hidden="true" />}
          title="녹음 내용"
          badge={<span className="text-[13px] font-semibold text-ink-muted">{audioClips.length}개</span>}
        >
          <div className="divide-y divide-line">
            {audioClips.map((clip) => (
              <ClipPlayer key={clip.url} url={clip.url} label={clip.label} durationSec={clip.durationSec} />
            ))}
          </div>
        </Section>

        {/* 2. STT 결과 */}
        <Section icon={<FileText className="size-4" aria-hidden="true" />} title="음성 텍스트" badge={<MockBadge />}>
          <Transcript text={review.transcript} highlights={evidences} />
          <p className="mt-3 text-[12px] text-ink-muted">노란 표시는 자동 정리에 쓰인 부분이에요</p>
        </Section>

        {/* 3. 필드 구조화 결과 (fields를 순회하므로 필드가 늘어나도 수정 불필요) */}
        <Section
          icon={<ListChecks className="size-4" aria-hidden="true" />}
          title="자동 정리"
          note={
            needCheckCount > 0 && (
              <span className="text-[14px] font-bold text-warning">확인 필요 {needCheckCount}</span>
            )
          }
          badge={<MockBadge />}
        >
          <dl className="divide-y divide-line">
            {fields.map(([key, field]) => (
              <div key={key} className="flex items-center justify-between gap-4 py-3.5">
                <dt className="shrink-0 text-[15px] text-ink-muted">{FIELD_LABELS[key] ?? key}</dt>
                <dd className="text-right text-[15px] font-bold">
                  {field.value || <span className="text-warning">확인 필요</span>}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>

      {/* 4. 추가 녹음, 삭제 버튼 */}
      <section className="flex flex-col shrink-0 gap-2 border-t border-line bg-white px-5 pt-3 pb-[max(32px,env(safe-area-inset-bottom))]">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onBack} className="flex-1 px-2 text-[15px] whitespace-nowrap text-danger">
            삭제하고 돌아가기
          </Button>
          <Button onClick={onAdd} className="flex-1 whitespace-nowrap">
            <Plus className="size-5" strokeWidth={2.6} aria-hidden="true" />
            추가 녹음
          </Button>
        </div>
        <Button onClick={onSave} className="h-14 w-full text-[17px]">
          저장
        </Button>

      </section>
    </main>
  );
}
