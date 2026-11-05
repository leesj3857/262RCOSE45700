import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { formatTime } from "@/lib/formatTime";
import type { IssueEvent } from "@/types/analytics";

const BARS = 48;
const SPEEDS = [1, 1.5, 2] as const;

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
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const timer = useRef<number | null>(null);
  const heights = useMemo(() => barHeights(event.id), [event.id]);

  function halt() {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    window.speechSynthesis?.cancel();
  }

  function play(from: number, rate: number) {
    halt();
    setElapsed(from);
    setPlaying(true);

    if (typeof SpeechSynthesisUtterance !== "undefined" && window.speechSynthesis) {
      const text = event.transcript.slice(Math.floor((from / event.audioSec) * event.transcript.length));
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR";
      u.rate = Math.min(2.2, Math.max(0.8, (event.transcript.length / (event.audioSec * 5.5)) * rate));
      window.speechSynthesis.speak(u);
    }

    const t0 = performance.now();
    timer.current = window.setInterval(() => {
      const sec = from + ((performance.now() - t0) / 1000) * rate;
      if (sec >= event.audioSec) {
        halt();
        setPlaying(false);
        setElapsed(event.audioSec);
      } else {
        setElapsed(sec);
      }
    }, 80);
  }

  function pause() {
    halt();
    setPlaying(false);
  }

  function seek(frac: number) {
    const to = Math.min(event.audioSec - 0.05, Math.max(0, frac * event.audioSec));
    if (playing) play(to, speed);
    else setElapsed(to);
  }

  function cycleSpeed() {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    if (playing) play(elapsed, next);
  }

  useEffect(() => halt, []);

  const progress = elapsed / event.audioSec;
  const atEnd = elapsed >= event.audioSec;

  return (
    <div className="flex flex-col gap-3 rounded-[20px] bg-surface p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => (playing ? pause() : play(atEnd ? 0 : elapsed, speed))}
          aria-label={playing ? "일시정지" : atEnd ? "다시 재생" : "재생"}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-kakao text-ink transition-transform active:scale-95 active:bg-kakao-press"
        >
          {playing ? (
            <Pause className="size-5 fill-current" aria-hidden="true" />
          ) : atEnd ? (
            <RotateCcw className="size-5" aria-hidden="true" />
          ) : (
            <Play className="ml-0.5 size-5 fill-current" aria-hidden="true" />
          )}
        </button>
        <div
          role="slider"
          tabIndex={0}
          aria-label="재생 위치"
          aria-valuemin={0}
          aria-valuemax={event.audioSec}
          aria-valuenow={Math.round(elapsed)}
          aria-valuetext={`${formatTime(elapsed)} / ${formatTime(event.audioSec)}`}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seek((e.clientX - rect.left) / rect.width);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") seek((elapsed + 2) / event.audioSec);
            if (e.key === "ArrowLeft") seek((elapsed - 2) / event.audioSec);
          }}
          className="flex h-12 flex-1 cursor-pointer items-center gap-[2px] rounded-[10px]"
        >
          {heights.map((h, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`w-full rounded-full ${i / BARS < progress ? "bg-ink" : "bg-ink/20"}`}
              style={{ height: `${h * 100}%` }}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between px-1">
        <span className="num text-[13px] font-semibold text-ink-sub">
          {formatTime(elapsed)} / {formatTime(event.audioSec)}
        </span>
        <button
          type="button"
          onClick={cycleSpeed}
          aria-label={`재생 속도 ${speed}배`}
          className="num h-9 min-w-14 rounded-full bg-white px-3 text-[13px] font-extrabold shadow-sm active:bg-line"
        >
          {speed}x
        </button>
      </div>
    </div>
  );
}
