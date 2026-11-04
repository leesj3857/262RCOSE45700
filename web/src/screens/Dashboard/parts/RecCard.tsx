import { ArrowRight, Lightbulb, X } from "lucide-react";
import { PRIORITY_LABEL, type Recommendation } from "@/lib/recommendations";
import { dismissRec, restoreRec } from "@/state/userData";
import { showToast } from "@/state/toast";
import { navigate } from "@/lib/useHashRoute";

const BAR = { high: "bg-danger", mid: "bg-kakao", low: "bg-ink-muted/40" } as const;
const TAG = { high: "bg-danger/10 text-danger", mid: "bg-kakao-soft text-ink", low: "bg-surface text-ink-sub" } as const;

type Props = {
  rec: Recommendation;
  detailed?: boolean;
};

export default function RecCard({ rec, detailed = false }: Props) {
  function dismiss() {
    dismissRec(rec.id);
    showToast("추천을 숨겼어요", { label: "되돌리기", run: () => restoreRec(rec.id) });
  }

  return (
    <article className="relative flex gap-3 overflow-hidden rounded-[22px] border border-line bg-white p-4 pl-5">
      <span className={`absolute inset-y-0 left-0 w-1.5 ${BAR[rec.priority]}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-extrabold ${TAG[rec.priority]}`}>
            {PRIORITY_LABEL[rec.priority]}
          </span>
          <button
            type="button"
            onClick={dismiss}
            aria-label="이 추천 숨기기"
            className="-mt-1 -mr-1 flex size-10 items-center justify-center rounded-full text-ink-muted active:bg-surface"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <h3 className="mt-1 text-[16px] leading-snug font-extrabold">{rec.title}</h3>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-sub">{rec.reason}</p>

        {detailed && (
          <>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {rec.evidence.map((e) => (
                <li key={e} className="rounded-full bg-surface px-2.5 py-1 text-[12px] font-semibold text-ink-sub">
                  {e}
                </li>
              ))}
            </ul>
            <p className="mt-3 flex gap-2 rounded-[14px] bg-kakao-soft p-3 text-[13px] leading-relaxed font-medium">
              <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {rec.action}
            </p>
          </>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {rec.ctas.map((c, i) => (
            <button
              key={c.label}
              type="button"
              onClick={() => navigate(c.href)}
              className={
                i === 0
                  ? "inline-flex h-10 items-center gap-1.5 rounded-full bg-ink pr-3 pl-4 text-[13px] font-bold text-white active:scale-[0.98]"
                  : "inline-flex h-10 items-center rounded-full px-3 text-[13px] font-bold text-ink-sub active:bg-surface"
              }
            >
              {c.label}
              {i === 0 && <ArrowRight className="size-3.5 text-kakao" strokeWidth={2.8} aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
