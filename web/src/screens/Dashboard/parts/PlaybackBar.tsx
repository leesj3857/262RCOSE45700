import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { formatTime } from "@/lib/formatTime";
import type { IssueEvent } from "@/types/analytics";

const BARS = 44;

function barHeights(id: string): number[] {
  let seed = 0;
  for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  return Array.from({ length: BARS }, (_, i) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const envelope = Math.sin((i / BARS) * Math.PI);
    return 0.18 + (seed / 4294967296) * 0.55 * (0.4 + envelope * 0.6) + envelope * 0.2;
  });
}

export default function PlaybackBar({ event }: { event: IssueEvent }) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<number | null>(null);
  const heights = useMemo(() => barHeights(event.id), [event.id]);

  function stop(reset: boolean) {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    window.speechSynthesis?.cancel();
    setPlaying(false);
    if (reset) setElapsed(0);
  }

  function start() {
    const from = elapsed >= event.audioSec ? 0 : elapsed;
    setElapsed(from);
    setPlaying(true);

    if (typeof SpeechSynthesisUtterance !== "undefined" && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(event.transcript);
      u.lang = "ko-KR";
      u.rate = Math.min(1.6, Math.max(0.8, event.transcript.length / (event.audioSec * 5.5)));
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }

    const t0 = performance.now() - from * 1000;
    timer.current = window.setInterval(() => {
      const sec = (performance.now() - t0) / 1000;
      if (sec >= event.audioSec) {
        stop(false);
        setElapsed(event.audioSec);
      } else {
        setElapsed(sec);
      }
    }, 80);
  }

  useEffect(() => () => stop(false), []);

  const progress = elapsed / event.audioSec;

  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-surface p-3 pr-4">
      <button
        type="button"
        onClick={() => (playing ? stop(false) : start())}
        aria-label={playing ? "일시정지" : "재생"}
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-kakao text-ink transition-transform active:scale-95 active:bg-kakao-press"
      >
        {playing ? <Pause className="size-5 fill-current" aria-hidden="true" /> : <Play className="ml-0.5 size-5 fill-current" aria-hidden="true" />}
      </button>
      <div className="flex h-10 flex-1 items-center gap-[2px]" aria-hidden="true">
        {heights.map((h, i) => (
          <span
            key={i}
            className={`w-full rounded-full ${i / BARS < progress ? "bg-ink" : "bg-ink/20"}`}
            style={{ height: `${h * 100}%` }}
          />
        ))}
      </div>
      <span className="num w-[92px] shrink-0 whitespace-nowrap text-right text-[13px] font-semibold text-ink-sub">
        {formatTime(elapsed)} / {formatTime(event.audioSec)}
      </span>
    </div>
  );
}
