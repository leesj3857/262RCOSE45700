import { useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { showToast } from "@/state/toast";
import { resetUserData } from "@/state/userData";
import Sheet from "./Sheet";

function Row({ icon, title, hint, onClick, danger = false }: { icon: ReactNode; title: string; hint?: string; onClick: () => void; danger?: boolean }) {
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
        {hint && <span className="block text-[13px] text-ink-muted">{hint}</span>}
      </span>
    </button>
  );
}

export default function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [confirming, setConfirming] = useState(false);

  function reset() {
    resetUserData();
    setConfirming(false);
    showToast("검토 상태와 메모를 처음으로 되돌렸어요");
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="더보기">
      <div className="flex flex-col">
        <div className="my-2 border-t border-line" />
        {confirming ? (
          <div className="rounded-[18px] bg-danger/5 p-4">
            <p className="text-[14px] font-bold text-danger">검토 상태, 메모, 수정 내용이 모두 사라져요</p>
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
          <Row icon={<RotateCcw className="size-5" aria-hidden="true" />} title="시연 데이터 초기화" onClick={() => setConfirming(true)} danger />
        )}
      </div>
    </Sheet>
  );
}
