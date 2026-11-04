import { useState, type ReactNode } from "react";
import { ChartColumn, Copy, Download, LayoutDashboard, Link2, List, Map as MapIcon, RotateCcw } from "lucide-react";
import { summarize } from "@/lib/analytics";
import { copyText, downloadText, eventsToCsv, summaryText } from "@/lib/exporters";
import { periodLabel } from "@/lib/scope";
import { navigate } from "@/lib/useHashRoute";
import { showToast } from "@/state/toast";
import { useScopeData } from "@/state/useScopeData";
import { resetUserData } from "@/state/userData";
import Sheet from "./Sheet";

const GUIDE = [
  { Icon: LayoutDashboard, title: "요약", text: "이번 주 상황을 보고, 지금 해야 할 일을 확인해요", href: "/admin" },
  { Icon: List, title: "이벤트", text: "기록을 찾고(검색·필터), 하나씩 열어 검토해요", href: "/admin/events" },
  { Icon: ChartColumn, title: "분석", text: "언제·무엇이·어디서 늘었는지, 추천 조치를 봐요", href: "/admin/analysis" },
  { Icon: MapIcon, title: "지도", text: "어느 구간에서 많이 생기는지 위치로 봐요", href: "/admin/map" },
];

function Row({ icon, title, hint, onClick, danger = false }: { icon: ReactNode; title: string; hint: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-[18px] px-3 py-3 text-left transition-colors active:bg-surface"
    >
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${danger ? "bg-danger/10 text-danger" : "bg-surface text-ink"}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className={`block text-[15px] font-bold ${danger ? "text-danger" : ""}`}>{title}</span>
        <span className="block text-[13px] text-ink-muted">{hint}</span>
      </span>
    </button>
  );
}

export default function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { scope, range, events, baseline } = useScopeData();
  const [confirming, setConfirming] = useState(false);

  async function copySummary() {
    const text = summaryText(summarize(events, baseline, range), range, periodLabel(scope));
    const ok = await copyText(text);
    showToast(ok ? "요약을 복사했어요" : "복사하지 못했어요");
    onClose();
  }

  async function copyLink() {
    const ok = await copyText(window.location.href);
    showToast(ok ? "링크를 복사했어요" : "복사하지 못했어요");
    onClose();
  }

  function exportCsv() {
    downloadText(`주행이슈_${range.start}_${range.end}.csv`, eventsToCsv(events));
    showToast(`${events.length}건을 CSV로 내보냈어요`);
    onClose();
  }

  function reset() {
    resetUserData();
    setConfirming(false);
    showToast("검토 상태와 메모를 처음으로 되돌렸어요");
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="더보기 · 도움말">
      <div className="flex flex-col">
        <p className="px-3 pt-1 pb-1 text-[13px] font-bold text-ink-sub">어디서 무엇을 하나요?</p>
        {GUIDE.map((g) => (
          <Row
            key={g.href}
            icon={<g.Icon className="size-5" aria-hidden="true" />}
            title={g.title}
            hint={g.text}
            onClick={() => {
              onClose();
              navigate(g.href);
            }}
          />
        ))}
        <div className="my-2 border-t border-line" />
        <p className="px-3 pt-1 pb-1 text-[13px] font-bold text-ink-sub">내보내기·공유</p>
        <Row icon={<Copy className="size-5" aria-hidden="true" />} title="요약 텍스트 복사" hint="메신저나 보고서에 바로 붙여넣기" onClick={copySummary} />
        <Row icon={<Download className="size-5" aria-hidden="true" />} title="CSV로 내보내기" hint={`지금 범위의 이벤트 ${events.length}건`} onClick={exportCsv} />
        <Row icon={<Link2 className="size-5" aria-hidden="true" />} title="현재 화면 링크 복사" hint="필터와 범위를 그대로 공유" onClick={copyLink} />
        <div className="my-2 border-t border-line" />
        {confirming ? (
          <div className="rounded-[18px] bg-danger/5 p-4">
            <p className="text-[14px] font-bold text-danger">검토 상태·메모·수정한 항목이 모두 처음으로 돌아가요.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="h-11 flex-1 rounded-full bg-white text-[14px] font-bold">
                취소
              </button>
              <button type="button" onClick={reset} className="h-11 flex-1 rounded-full bg-danger text-[14px] font-extrabold text-white">
                초기화
              </button>
            </div>
          </div>
        ) : (
          <Row icon={<RotateCcw className="size-5" aria-hidden="true" />} title="시연 데이터 초기화" hint="검토 상태, 메모, 수정 내용을 처음으로" onClick={() => setConfirming(true)} danger />
        )}
        <p className="mt-4 px-3 text-[12px] leading-relaxed text-ink-muted">
          예시 데이터로 구성한 화면입니다. 서버와 연결하기 전에 화면 흐름과 분석 방식을 확인하는 용도예요.
        </p>
      </div>
    </Sheet>
  );
}
