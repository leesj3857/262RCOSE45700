import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw, X } from "lucide-react";
import { STEPS, type Act, type Target } from "./steps";

const PW = 390;
const PH = 800;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function resolve(doc: Document, t: Target): HTMLElement | null {
  const list = Array.from(doc.querySelectorAll<HTMLElement>(t.sel));
  if (!t.text) return list[0] ?? null;
  const text = t.text;
  return list.find((el) => (t.starts ? (el.textContent ?? "").trim().startsWith(text) : (el.textContent ?? "").includes(text))) ?? null;
}

export default function Demo() {
  const frame = useRef<HTMLIFrameElement>(null);
  const run = useRef(0);
  const [index, setIndex] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(false);
  const [scale, setScale] = useState(1);
  const [cursor, setCursor] = useState({ x: PW / 2, y: PH / 2, on: false, press: 0 });

  useEffect(() => {
    const fit = () => setScale(Math.min(1.15, (window.innerHeight - 56) / (PH + 20), (window.innerWidth * 0.5) / (PW + 20)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const play = useCallback(async (i: number) => {
    const id = ++run.current;
    const alive = () => id === run.current;
    const win = frame.current?.contentWindow as (Window & typeof globalThis) | null | undefined;
    if (!win) return;
    setBusy(true);
    setCursor((c) => ({ ...c, on: false }));

    const find = async (t: Target) => {
      for (let n = 0; n < 12; n++) {
        const el = resolve(win.document, t);
        if (el) return el;
        await sleep(150);
        if (!alive()) return null;
      }
      return null;
    };

    const exec = async (a: Act) => {
      if ("go" in a) {
        win.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape" }));
        win.location.hash = `#${a.go}`;
        await sleep(400);
        win.document.querySelector("main")?.scrollTo({ top: 0 });
      } else if ("wait" in a) {
        await sleep(a.wait);
      } else if ("scroll" in a) {
        win.document.querySelector("main")?.scrollTo({ top: a.scroll, behavior: "smooth" });
        await sleep(700);
      } else if ("esc" in a) {
        win.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape" }));
        await sleep(400);
      } else if ("enter" in a) {
        const el = win.document.activeElement;
        el?.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        el?.dispatchEvent(new win.KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
        await sleep(300);
      } else {
        const target = "tap" in a ? a.tap : a.type.into;
        const el = await find(target);
        if (!el || !alive()) return;
        el.scrollIntoView({ block: "center" });
        await sleep(200);
        const r = el.getBoundingClientRect();
        setCursor((c) => ({ ...c, x: r.left + r.width / 2, y: r.top + r.height / 2, on: true }));
        await sleep(800);
        if (!alive()) return;
        setCursor((c) => ({ ...c, press: c.press + 1 }));
        await sleep(180);
        el.click();
        if (el instanceof win.HTMLInputElement) el.focus();
        if ("type" in a && el instanceof win.HTMLInputElement) {
          const setter = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, "value")?.set;
          let value = "";
          for (const ch of a.type.text) {
            value += ch;
            setter?.call(el, value);
            el.dispatchEvent(new win.Event("input", { bubbles: true }));
            await sleep(70);
            if (!alive()) return;
          }
        }
        await sleep(300);
      }
    };

    for (const a of STEPS[i].acts) {
      if (!alive()) return;
      await exec(a);
    }
    if (alive()) {
      setCursor((c) => ({ ...c, on: false }));
      setBusy(false);
    }
  }, []);

  const go = useCallback(
    (i: number) => {
      const next = Math.max(-1, Math.min(STEPS.length, i));
      setIndex(next);
      if (next >= 0 && next < STEPS.length) {
        void play(next);
      } else {
        run.current += 1;
        setBusy(false);
        setCursor((c) => ({ ...c, on: false }));
        const win = frame.current?.contentWindow as (Window & typeof globalThis) | null | undefined;
        if (win) {
          win.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape" }));
          win.location.hash = "#/admin";
        }
      }
    },
    [play],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === "ArrowLeft") {
        go(index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  useEffect(() => {
    if (!auto || busy || index >= STEPS.length) return;
    const t = setTimeout(() => go(index + 1), 1600);
    return () => clearTimeout(t);
  }, [auto, busy, index, go]);

  const step = index >= 0 && index < STEPS.length ? STEPS[index] : null;
  const intro = index < 0;
  const outro = index >= STEPS.length;

  return (
    <div
      className="fixed inset-0 flex cursor-pointer items-center justify-center gap-[6vw] overflow-hidden bg-page px-[5vw] select-none"
      onClick={() => go(index + 1)}
    >
      <section className="flex w-[min(480px,38vw)] shrink-0 flex-col">
        {intro && (
          <>
            <p className="text-[13px] font-bold tracking-[0.1em] text-ink-sub uppercase">Kakao Mobility × Korea University</p>
            <h1 className="mt-4 text-[clamp(32px,3.6vw,52px)] leading-[1.15] font-extrabold tracking-tight">관리자용 주행 이슈 분석 대시보드</h1>
            <p className="mt-5 text-[clamp(16px,1.4vw,21px)] leading-relaxed text-ink-sub">화면을 클릭하면 시작해요</p>
          </>
        )}
        {step && (
          <div key={index} className="animate-[fade-in_0.4s_ease]">
            <span className="num inline-flex h-9 items-center rounded-full bg-kakao px-4 text-[14px] font-extrabold">
              {index + 1} / {STEPS.length}
            </span>
            <h2 className="mt-5 text-[clamp(32px,3.6vw,52px)] leading-[1.1] font-extrabold tracking-tight">{step.title}</h2>
            <p className="mt-5 text-[clamp(16px,1.4vw,21px)] leading-relaxed text-ink-sub">{step.line}</p>
          </div>
        )}
        {outro && (
          <>
            <h2 className="text-[clamp(32px,3.6vw,52px)] leading-[1.1] font-extrabold tracking-tight">여기까지예요</h2>
            <p className="mt-5 text-[clamp(16px,1.4vw,21px)] leading-relaxed text-ink-sub">질문이나 의견을 편하게 말씀해 주세요.</p>
          </>
        )}

        <div className="mt-10 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => go(index - 1)} disabled={index < 0} aria-label="이전" className="flex size-11 items-center justify-center rounded-full bg-white shadow-card disabled:opacity-30">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => go(index + 1)} disabled={outro} aria-label="다음" className="flex size-11 items-center justify-center rounded-full bg-ink text-white disabled:opacity-30">
            <ArrowRight className="size-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setAuto((v) => !v)} aria-pressed={auto} className={`flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-bold shadow-card ${auto ? "bg-kakao" : "bg-white"}`}>
            {auto ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
            자동 재생
          </button>
          {outro && (
            <button type="button" onClick={() => go(-1)} className="flex h-11 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-bold shadow-card">
              <RotateCcw className="size-4" aria-hidden="true" />
              처음부터
            </button>
          )}
        </div>

        <div className="mt-8 flex gap-1.5" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-ink" : i < index ? "w-4 bg-ink/40" : "w-4 bg-ink/15"}`} />
          ))}
        </div>
      </section>

      <div style={{ width: (PW + 20) * scale, height: (PH + 20) * scale }} className="relative shrink-0">
        <div
          style={{ width: PW + 20, height: PH + 20, transform: `scale(${scale})`, transformOrigin: "top left" }}
          className="absolute top-0 left-0 rounded-[48px] border-[10px] border-ink bg-ink shadow-[0_30px_80px_rgba(25,25,25,0.25)]"
        >
          <div className="relative size-full overflow-hidden rounded-[38px] bg-page">
            <iframe ref={frame} src="/#/admin" title="관리자 대시보드" style={{ width: PW, height: PH }} className="pointer-events-none block border-0" />
            <span
              aria-hidden="true"
              style={{ left: cursor.x, top: cursor.y, opacity: cursor.on ? 1 : 0 }}
              className="pointer-events-none absolute z-50 size-0 transition-[left,top,opacity] duration-700 ease-in-out"
            >
              <span className="absolute -top-4 -left-4 size-8 rounded-full border-2 border-white bg-ink/80 shadow-lg" />
              <span key={cursor.press} className="absolute -top-6 -left-6 size-12 animate-[ripple_0.55s_ease-out] rounded-full bg-kakao/70 opacity-0" />
            </span>
          </div>
        </div>
      </div>

      <a href="#/admin" onClick={(e) => e.stopPropagation()} aria-label="시연 끝내기" className="absolute top-5 right-5 flex size-11 items-center justify-center rounded-full bg-white shadow-card">
        <X className="size-5" aria-hidden="true" />
      </a>
    </div>
  );
}
