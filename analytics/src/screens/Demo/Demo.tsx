import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject, type SyntheticEvent } from "react";
import { ArrowLeft, ArrowRight, BatteryFull, Pause, Play, RotateCcw, Signal, Wifi, X } from "lucide-react";
import { STEPS, estimate } from "./steps";
import { Overlay, SH, SW, navigate, perform, sleep, type Ctx, type Win } from "./engine";
import "./demo.css";

const BAR = 50;
const EDGE = 14;
const DW = SW + EDGE * 2;
const DH = SH + BAR + EDGE * 2;
const N = STEPS.length;
const AUTO_DELAY = 1600;

type Caption = { id: number; scene: number; out: boolean };

const pad2 = (n: number) => String(n).padStart(2, "0");

function useLayout() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const root = document.documentElement;
    const fit = () => setSize({ w: root.clientWidth, h: root.clientHeight });
    const ro = new ResizeObserver(fit);
    ro.observe(root);
    window.addEventListener("resize", fit);
    fit();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);
  const scale = Math.max(0.4, Math.min((size.h - 56) / DH, (size.w * 0.46) / DW, 1.4));
  const gap = Math.round(Math.min(150, Math.max(48, size.w * 0.07)));
  const col = Math.round(Math.max(300, Math.min(560, size.w - DW * scale - gap - size.w * 0.12)));
  return { scale, gap, col };
}

function CaptionBody({ scene, onReplay }: { scene: number; onReplay: () => void }) {
  const d = (i: number) => ({ animationDelay: `${120 + i * 80}ms` });
  if (scene < 0) {
    return (
      <>
        <p style={d(0)} className="demo-in text-[13px] font-bold tracking-[0.08em] text-ink-muted">
          Kakao Mobility × Korea University
        </p>
        <h1 style={d(1)} className="demo-in mt-5 text-[clamp(40px,4.4vw,72px)] leading-[1.08] font-extrabold tracking-[-0.035em]">
          관리자용 주행 이슈 분석 대시보드
        </h1>
        <p style={d(2)} className="demo-in mt-8 flex items-center gap-3 text-[clamp(16px,1.35vw,20px)] font-semibold text-ink-sub">
          <span className="demo-hint-dot size-2.5 rounded-full bg-kakao shadow-[0_0_0_4px_rgba(254,229,0,0.3)]" aria-hidden="true" />
          클릭하면 시작해요
        </p>
      </>
    );
  }
  if (scene >= N) {
    return (
      <>
        <h2 style={d(0)} className="demo-in text-[clamp(44px,4.6vw,76px)] leading-[1.06] font-extrabold tracking-[-0.035em]">
          여기까지예요
        </h2>
        <div style={d(1)} className="demo-in mt-9">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReplay();
            }}
            className="inline-flex h-14 items-center gap-2.5 rounded-full bg-ink pr-7 pl-6 text-[16px] font-bold text-white shadow-float transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.03] active:scale-[0.98]"
          >
            <RotateCcw className="size-[18px]" aria-hidden="true" />
            처음부터 다시 보기
          </button>
        </div>
      </>
    );
  }
  const step = STEPS[scene];
  return (
    <>
      <p style={d(0)} className="demo-in num text-[15px] font-bold text-ink">
        {pad2(scene + 1)}
        <span className="text-ink-muted/70"> / {pad2(N)}</span>
      </p>
      <h2 style={d(1)} className="demo-in mt-4 text-[clamp(44px,4.6vw,76px)] leading-[1.06] font-extrabold tracking-[-0.035em]">
        {step.title}
      </h2>
      <p style={d(2)} className="demo-in mt-6 max-w-[34ch] text-[clamp(17px,1.45vw,23px)] leading-[1.55] font-medium text-ink-sub">
        {step.line}
      </p>
    </>
  );
}

function Phone({ ov, frame, scale }: { ov: Overlay; frame: RefObject<HTMLIFrameElement | null>; scale: number }) {
  return (
    <div style={{ width: DW, height: DH, transform: `scale(${scale})`, transformOrigin: "top left" }} className="absolute top-0 left-0">
      <div className="demo-floor absolute -bottom-10 left-[8%] h-16 w-[84%]" aria-hidden="true" />
      <span className="demo-key absolute top-[150px] -left-[3px] h-[34px] w-[4px] rounded-l-[2px]" aria-hidden="true" />
      <span className="demo-key absolute top-[214px] -left-[3px] h-[62px] w-[4px] rounded-l-[2px]" aria-hidden="true" />
      <span className="demo-key absolute top-[290px] -left-[3px] h-[62px] w-[4px] rounded-l-[2px]" aria-hidden="true" />
      <span className="demo-key absolute top-[240px] -right-[3px] h-[96px] w-[4px] rounded-r-[2px]" aria-hidden="true" />
      <div className="demo-device absolute inset-0 rounded-[64px] p-[3px]">
        <div className="demo-bezel size-full rounded-[61px] p-[11px]">
          <div style={{ width: SW, height: SH + BAR }} className="relative overflow-hidden rounded-[50px] bg-page [transform:translateZ(0)]">
            <div ref={ov.attach("bar")} style={{ height: BAR }} className="absolute inset-x-0 top-0 flex items-center justify-between px-[30px] pt-1 transition-colors duration-300">
              <span className="num w-[86px] text-center text-[16px] font-semibold tracking-[-0.01em]">9:41</span>
              <span className="flex w-[86px] items-center justify-center gap-[5px]">
                <Signal className="size-[17px]" strokeWidth={2.6} aria-hidden="true" />
                <Wifi className="size-[17px]" strokeWidth={2.6} aria-hidden="true" />
                <BatteryFull className="size-[22px]" strokeWidth={2} aria-hidden="true" />
              </span>
            </div>
            <div style={{ top: BAR, width: SW, height: SH }} className="absolute left-0">
              <iframe ref={frame} src="/#/admin" title="관리자 대시보드" tabIndex={-1} style={{ width: SW, height: SH }} className="pointer-events-none block border-0" />
              <div ref={ov.attach("curtainEl")} className="demo-curtain pointer-events-none absolute inset-0 bg-page opacity-0" />
            </div>
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              <div ref={ov.attach("layer")} style={{ top: BAR }} className="absolute left-0 size-0">
                <div ref={ov.attach("spot")} className="demo-spot" />
                <div ref={ov.attach("note")} className="demo-note">
                  <span className="demo-bubble">
                    <span ref={ov.attach("noteText")} />
                  </span>
                </div>
                <div ref={ov.attach("touch")} className="demo-touch">
                  <span className="demo-touch-dot" />
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute top-[11px] left-1/2 z-10 h-[36px] w-[124px] -translate-x-1/2 rounded-full bg-black" aria-hidden="true" />
            <div className="pointer-events-none absolute bottom-[7px] left-1/2 z-10 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-ink/85" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Demo() {
  const frame = useRef<HTMLIFrameElement>(null);
  const phone = useRef<HTMLDivElement>(null);
  const [ov] = useState(() => new Overlay());
  const run = useRef(0);
  const cid = useRef(0);
  const indexRef = useRef(-1);
  const [index, setIndex] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(false);
  const [progress, setProgress] = useState({ v: 0, d: 0 });
  const [captions, setCaptions] = useState<Caption[]>([{ id: 0, scene: -1, out: false }]);
  const { scale, gap, col } = useLayout();

  const getWin = useCallback(() => (frame.current?.contentWindow as Win | null | undefined) ?? null, []);

  useEffect(() => {
    ov.start(getWin, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    return () => ov.stop();
  }, [ov, getWin]);

  const ready = useCallback(async (alive: () => boolean) => {
    for (let n = 0; n < 100 && alive(); n++) {
      const doc = frame.current?.contentDocument;
      if (doc && doc.readyState === "complete" && doc.querySelector("main")) return true;
      await sleep(100);
    }
    return false;
  }, []);

  const play = useCallback(
    async (i: number) => {
      const id = ++run.current;
      const alive = () => id === run.current;
      setBusy(true);
      setProgress({ v: 0, d: 0 });
      if (!(await ready(alive))) return;
      const ctx: Ctx = { ov, win: getWin, alive };
      const acts = STEPS[i].acts;
      const total = acts.reduce((s, a) => s + estimate(a), 0);
      let cum = 0;
      for (const a of acts) {
        if (!alive()) return;
        const e = estimate(a);
        cum += e;
        setProgress({ v: (cum / total) * 100, d: e });
        await perform(ctx, a);
      }
      if (!alive()) return;
      ov.release();
      setProgress({ v: 100, d: 250 });
      setBusy(false);
    },
    [ov, getWin, ready],
  );

  const reset = useCallback(async () => {
    const id = ++run.current;
    const alive = () => id === run.current;
    setBusy(false);
    ov.release();
    if (!(await ready(alive))) return;
    await navigate({ ov, win: getWin, alive }, "/admin");
  }, [ov, getWin, ready]);

  const go = useCallback(
    (i: number) => {
      const next = Math.max(-1, Math.min(N, i));
      if (next === indexRef.current) return;
      indexRef.current = next;
      setIndex(next);
      if (!ov.reduced) {
        phone.current?.animate(
          [
            { transform: "translateY(14px) scale(0.975)", filter: "saturate(0.96)" },
            { transform: "translateY(0) scale(1)", filter: "saturate(1)" },
          ],
          { duration: 1000, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        );
      }
      if (next >= 0 && next < N) void play(next);
      else void reset();
    },
    [ov, play, reset],
  );

  const next = useCallback(() => go(indexRef.current + 1), [go]);
  const prev = useCallback(() => go(indexRef.current - 1), [go]);

  useLayoutEffect(() => {
    setCaptions((list) => {
      if (list.length && list[list.length - 1].scene === index && !list[list.length - 1].out) return list;
      cid.current += 1;
      return [...list.filter((c) => !c.out).map((c) => ({ ...c, out: true })), { id: cid.current, scene: index, out: false }];
    });
    const t = setTimeout(() => setCaptions((list) => list.filter((c) => !c.out)), 420);
    return () => clearTimeout(t);
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = e.target instanceof Element ? e.target.closest("button, a") : null;
      if ((e.key === " " || e.key === "Enter") && tag) return;
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter" || e.key === "PageDown") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", onKey);
    let inner: Win | null = null;
    const bind = () => {
      inner?.removeEventListener("keydown", onKey);
      inner = getWin();
      inner?.addEventListener("keydown", onKey);
    };
    const f = frame.current;
    bind();
    f?.addEventListener("load", bind);
    return () => {
      window.removeEventListener("keydown", onKey);
      inner?.removeEventListener("keydown", onKey);
      f?.removeEventListener("load", bind);
    };
  }, [next, prev, getWin]);

  useEffect(() => {
    if (!auto || busy || index >= N) return;
    const t = setTimeout(next, AUTO_DELAY);
    return () => clearTimeout(t);
  }, [auto, busy, index, next]);

  useEffect(() => () => void (run.current += 1), []);

  const intro = index < 0;
  const outro = index >= N;
  const counting = auto && !busy && !outro;
  const waiting = !auto && !busy && !outro;
  const stop = (e: SyntheticEvent) => e.stopPropagation();
  const btn = "flex size-12 items-center justify-center rounded-full transition-[transform,background-color,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.06] active:scale-[0.95] disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="demo-stage fixed inset-0 cursor-pointer overflow-hidden select-none" onClick={next}>
      <div className="demo-grain pointer-events-none absolute inset-0" aria-hidden="true" />

      <a
        href="#/admin"
        onClick={stop}
        aria-label="시연 끝내기"
        className="absolute top-5 right-6 z-10 flex size-11 items-center justify-center rounded-full bg-white/80 text-ink-sub shadow-card backdrop-blur transition-[transform,color] duration-300 hover:scale-[1.06] hover:text-ink"
      >
        <X className="size-5" aria-hidden="true" />
      </a>

      <div className="relative flex h-full items-center justify-center" style={{ gap }}>
        <section style={{ width: col, height: DH * scale }} className="flex shrink-0 flex-col py-2">
          <div className={`flex gap-1.5 transition-opacity duration-500 ${intro || outro ? "opacity-0" : "opacity-100"}`} aria-hidden="true">
            {STEPS.map((s, i) => (
              <span key={s.title} className="relative h-[5px] flex-1 overflow-hidden rounded-full bg-ink/10">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-ink"
                  style={{
                    width: i < index ? "100%" : i === index ? `${progress.v}%` : "0%",
                    transition: i === index ? `width ${progress.d}ms linear` : "none",
                  }}
                />
              </span>
            ))}
          </div>

          <div className="grid flex-1 items-center" aria-live="polite">
            {captions.map((c) => (
              <div key={c.id} className={`col-start-1 row-start-1 ${c.out ? "demo-out pointer-events-none" : ""}`} aria-hidden={c.out}>
                <CaptionBody scene={c.scene} onReplay={() => go(-1)} />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2.5" onClick={stop}>
            <button type="button" onClick={prev} disabled={intro} aria-label="이전" className={`${btn} bg-white text-ink shadow-card`}>
              <ArrowLeft className="size-5" aria-hidden="true" />
            </button>
            <button type="button" onClick={next} disabled={outro} aria-label="다음" className={`${btn} relative bg-ink text-white shadow-float ${waiting ? "demo-ready" : ""}`}>
              {counting && (
                <svg key={index} viewBox="0 0 40 40" className="absolute -inset-[5px] size-[58px] -rotate-90" aria-hidden="true">
                  <circle cx="20" cy="20" r="18" fill="none" stroke="#fee500" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="113" className="demo-countdown" />
                </svg>
              )}
              <ArrowRight className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setAuto((v) => !v)}
              aria-pressed={auto}
              className={`ml-1 flex h-12 items-center gap-2 rounded-full pr-5 pl-4 text-[14px] font-bold transition-[background-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.03] active:scale-[0.97] ${auto ? "bg-kakao text-ink shadow-[0_8px_24px_rgba(254,229,0,0.45)]" : "bg-white text-ink-sub shadow-card"}`}
            >
              {auto ? <Pause className="size-4" fill="currentColor" aria-hidden="true" /> : <Play className="size-4" fill="currentColor" aria-hidden="true" />}
              {auto ? "자동 재생 중" : "자동 재생"}
            </button>
            <button type="button" onClick={() => go(-1)} disabled={intro} aria-label="처음부터" className={`${btn} bg-white text-ink-sub shadow-card`}>
              <RotateCcw className="size-[18px]" aria-hidden="true" />
            </button>
            <span className="ml-3 hidden text-[13px] font-semibold text-ink-muted lg:inline">← → 로 이동</span>
          </div>
        </section>

        <div style={{ width: DW * scale, height: DH * scale }} className="relative shrink-0">
          <div ref={phone} className="absolute inset-0" style={{ transformOrigin: "50% 60%" }}>
            <Phone ov={ov} frame={frame} scale={scale} />
          </div>
        </div>
      </div>
    </div>
  );
}
